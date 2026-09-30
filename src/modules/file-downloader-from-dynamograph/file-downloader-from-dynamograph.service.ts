import {
  Inject,
  Injectable,
  Logger,
  LoggerService,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { M500Service } from '../postgres/m500.service';
import { ValkeyService } from '../valkey/valkey.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CronService } from '../cron/cron.service';
import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { ValkeyItemType } from 'src/types/ValkeyItem.type';
import { checkDateOnUpdate } from 'src/modules/file-downloader-from-dynamograph/helpers/checkDateOnUpdate.helper';
import { DownloadScreenType } from 'src/modules/file-downloader-from-dynamograph/types/DownloadScreen.type';
import { ALIASES } from 'src/constants/aliases';

@Injectable()
export class FileDownloaderFromDynamographService implements OnApplicationBootstrap {
  private actualizeIsActive: boolean = false;
  private backupScreenIsProcessing: boolean = false;
  private downloadScreen: DownloadScreenType = {};

  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly m500Service: M500Service,
    private readonly valkeyService: ValkeyService,
    private readonly systemConfig: SystemConfigService,
    private readonly cronService: CronService,
  ) {
    this.logger = addContextDecoratorLogger(
      logger,
      FileDownloaderFromDynamographService.name,
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    const historyDownloadScreen =
      await this.getCreatingFilesOnDeviceLogScreen();
    if (historyDownloadScreen) {
      this.downloadScreen = historyDownloadScreen;
      await this.actualizeDownloadScreenUpdates();
    }
    this.downloadScreen = await this.getNewDownloadScreen();
    this.initCronScheduleForParseData();
  }

  /* Настройки крона */
  private initCronScheduleForParseData(): void {
    // перед запуском крона проверяем на существование настроек вызова
    if (
      this.systemConfig.cronConfigs.cronDownloadFilesFromDynamographs ===
      undefined
    ) {
      throw new Error(
        'SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS is invalid or does not exist in env file',
      );
    }
    this.cronService.addCronJob(
      'SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS',
      this.systemConfig.cronConfigs.cronDownloadFilesFromDynamographs,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async () => {
        await this.actualizeDownloadScreenUpdates();
      },
    );
    this.logger.warn(
      `(initCronScheduleForParseData) the cron "SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS" with config "${this.systemConfig.cronConfigs.cronDownloadFilesFromDynamographs}" inited`,
    );
  }
  /* Конец настройки крона */

  async getNewDownloadScreen(): Promise<DownloadScreenType> {
    try {
      const devices = await this.m500Service.getDevices();
      const deviceIdList = devices.map((device) => device.id);
      const valkeyKeys = deviceIdList.map(
        (deviceId: number) =>
          `device/${deviceId}/${ALIASES.DYNAMOGRAM_SAVING_TIME}`,
      );
      const aliasData =
        await this.valkeyService.getAllValuesForKeys(valkeyKeys);

      const newScreen = {};
      aliasData.forEach((item) => {
        if (!item || item.device_id === null) {
          return;
        }
        if (!item.value) {
          return;
        }

        newScreen[item.device_id] = item;
      });
      return newScreen;
    } catch (e) {
      this.logger.error(e);
      return {};
    }
  }

  async actualizeDownloadScreenUpdates(): Promise<void> {
    if (this.actualizeIsActive === true) {
      this.logger.warn(`actualizeDownloadScreenUpdates is alredy processing`);
      return;
    }
    this.logger.log(`(actualizeDownloadScreenUpdates) started`);
    try {
      this.actualizeIsActive = true;
      const newScreen = await this.getNewDownloadScreen();
      const newScreenKeysList = Object.keys(newScreen);
      for (const key of newScreenKeysList) {
        if (!key) {
          continue;
        }
        const deviceId = Number(key);
        const newItem = newScreen[deviceId];

        const oldItem = this.downloadScreen[deviceId];
        if (!newItem) {
          return;
        }
        const isCanUpdate = checkDateOnUpdate(oldItem?.value, newItem.value);
        // only for trace
        // this.logger.log({
        //   isCanUpdate,
        //   oldItem: oldItem?.value,
        //   newItem: newItem.value,
        // });
        if (isCanUpdate === true) {
          await this.downloadNewFileFromDevice(newItem);
        } else {
          // обезопасит от применения бракованных значений поступивших из valkey к this.downloadScreen = newScreen ниже
          newScreen[deviceId] = oldItem;
        }
      }
      this.downloadScreen = newScreen;
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.actualizeIsActive = false;
      this.logger.log(`(actualizeDownloadScreenUpdates) finished`);
    }
  }

  async downloadNewFileFromDevice(valkeyItem: ValkeyItemType): Promise<void> {
    try {
      const deviceId = valkeyItem.device_id;
      const lastFileCreationUnixtimeDt = valkeyItem.value;
      this.logger.log(
        `(downloadNewFileFromDevice) started for valkeyItem.device_id=${valkeyItem.device_id}`,
      );
      if (!lastFileCreationUnixtimeDt) {
        this.logger.error(
          `(downloadNewFileFromDevice) lastFileCreationUnixtimeDt is invalid. lastFileCreationUnixtimeDt="${lastFileCreationUnixtimeDt}" `,
        );
        return;
      }
      if (!deviceId) {
        this.logger.error(
          `(downloadNewFileFromDevice) deviceId is invalid. deviceId="${deviceId}" `,
        );
        return;
      }
      const modemDeviceBind =
        await this.m500Service.getModemDeviceBindByDeviceId(deviceId);

      if (!modemDeviceBind) {
        this.logger.warn(
          `(downloadNewFileFromDevice) modem is not found for device_id=${deviceId}`,
        );
        return;
      }

      const { modem_id } = modemDeviceBind;

      this.logger.log(
        `(downloadNewFileFromDevice) inserting item into commands_spec. device_id="${deviceId}" modem_id="${modem_id}"`,
      );

      const item =
        await this.m500Service.sendDownloadDynamoFileFromDeviceToServerCommand(
          deviceId,
          modem_id,
        );
      this.logger.log(
        `(downloadNewFileFromDevice) item has been added to commands_spec.id="${item?.id}" device_id="${deviceId}" modem_id="${modem_id}"`,
      );

      this.logger.log(
        `(downloadNewFileFromDevice) inserting info into dynamogramm_creating_files_on_devices_log with data: commands_spec.id="${item?.id}" with device_id="${deviceId}" modem_id="${modem_id}"`,
      );
      await this.m500Service.saveCreatingFileDynamoInfoLog(
        deviceId,
        lastFileCreationUnixtimeDt,
      );
      this.logger.log(
        `(downloadNewFileFromDevice) info has been added into dynamogramm_creating_files_on_devices_log for device_id="${deviceId}" modem_id="${modem_id}"`,
      );
    } catch (e) {
      this.logger.error(e);
    }
  }

  async getCreatingFilesOnDeviceLogScreen(): Promise<
    DownloadScreenType | undefined
  > {
    if (this.backupScreenIsProcessing === true) {
      this.logger.warn(
        '(getCreatingFilesOnDeviceLogScreen) is already processing',
      );
      return;
    }

    const hystoryDownloadScreen: DownloadScreenType = {};
    try {
      this.logger.log(`(getCreatingFilesOnDeviceLogScreen) is started`);
      this.backupScreenIsProcessing = true;

      const logs =
        await this.m500Service.getDynamogrammCreatingFilesOnDevicesLog();

      for (const log of logs) {
        const item: ValkeyItemType = {
          device_id: log.device_id,
          modem_id: null,
          alias: ALIASES.DYNAMOGRAM_SAVING_TIME,
          value: log.last_file_creation_unixtime_dt,
          value_bool: null,
          value_string: null,
          dt: 0,
          alarm: null,
        };
        hystoryDownloadScreen[log.device_id] = item;
      }
      this.logger.log(`(getCreatingFilesOnDeviceLogScreen) finished`);
      return hystoryDownloadScreen;
    } catch (e) {
      this.logger.error(
        `(getCreatingFilesOnDeviceLogScreen) finished with ERROR`,
        e,
      );
      return;
    } finally {
      this.backupScreenIsProcessing = false;
    }
  }
}
