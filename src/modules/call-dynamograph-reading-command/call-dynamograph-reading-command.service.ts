/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  Inject,
  Injectable,
  Logger,
  LoggerService,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { M500Service } from '../postgres/m500.service';
import { ValkeyService } from '../valkey/valkey.service';
import { CronService } from '../cron/cron.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class CallDynamographReadingCommandService implements OnApplicationBootstrap {
  private actualizeIsActive: boolean = false;

  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly m500Service: M500Service,
    private readonly valkeyService: ValkeyService,
    private readonly systemConfig: SystemConfigService,
    private readonly cronService: CronService,
  ) {
    this.logger = addContextDecoratorLogger(
      logger,
      CallDynamographReadingCommandService.name,
    );
  }

  async onApplicationBootstrap() {
    await this.actualizeIntervalReadingCrons();
    this.initCronScheduleForParseData();
    // перед запуском крона проверяем на существование настроек вызова
  }

  /* Настройки крона */
  initCronScheduleForParseData() {
    if (
      this.systemConfig.cronConfigs
        .cronActualizeDynamographReadingCommandInterval === undefined
    ) {
      throw new Error(
        'SYSTEM_CRON_ACTUALIZE_DYNAMOGRAPH_READING_COMMAND_INTERVAL is invalid or does not exist in env file',
      );
    }
    this.cronService.addCronJob(
      'SYSTEM_CRON_ACTUALIZE_DYNAMOGRAPH_READING_COMMAND_INTERVAL',
      this.systemConfig.cronConfigs
        .cronActualizeDynamographReadingCommandInterval,
      async () => {
        await this.actualizeIntervalReadingCrons();
      },
    );
  }
  /* Конец настройки крона */

  async actualizeIntervalReadingCrons() {
    try {
      if (this.actualizeIsActive === true) {
        this.logger.log(
          '(actualizeIntervalReadingCrons) is already processing',
        );
        return;
      }
      this.logger.log('(actualizeIntervalReadingCrons) is started');
      this.actualizeIsActive = true;
      const deviceCommandSchedules =
        await this.m500Service.getAllDeviceDynamogrammCommandSchedules();

      const cronSettingsList = {};

      deviceCommandSchedules.forEach((item) => {
        const cronKey = `call_dynamograph_reading_command_${item.device_id}:${item.cron_timer}`;
        this.logger.log(
          `(actualizeIntervalReadingCrons) we got from table named "device_dynamogramm_prepare_command_schedule" the item with id ="${item.id}" device_id="${item.device_id}" and cron_timer="${item.cron_timer}", timezone="${item.timezone}"`,
        );
        cronSettingsList[cronKey] = {
          device_dynamogramm_prepare_command_schedule_id: item.id,
          device_id: item.device_id,
          cron_timer: item.cron_timer,
          last_command_send_dt: item.last_command_send_dt,
          method: async () => {
            await this.sendReadCommandToDynamograph(item.device_id, item.id);
          },
          timezone: item.timezone,
        };
      });

      this.cronService.updateCronProcesses(cronSettingsList);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.actualizeIsActive = false;
      this.logger.log('(actualizeIntervalReadingCrons) finished');
    }
  }

  async sendReadCommandToDynamograph(
    deviceId: number,
    deviceDynamogrammPrepareCommandScheduleId: number,
  ) {
    try {
      this.logger.log(
        `(sendReadCommandToDynamograph) started deviceId=${deviceId},deviceDynamogrammPrepareCommandScheduleId=${deviceDynamogrammPrepareCommandScheduleId}`,
      );
      const sendedAt = new Date();
      const modemDeviceBind =
        await this.m500Service.getModemDeviceBindByDeviceId(deviceId);
      if (!modemDeviceBind) {
        this.logger.warn(
          `(sendReadCommandToDynamograph) modem is not found for device_id=${deviceId}`,
        );
        return;
      }
      const { modem_id } = modemDeviceBind;
      const command = await this.m500Service.sendReadCommandToDynamograph(
        deviceId,
        modem_id,
      );
      await this.m500Service.updateLastReadCommandToDynamographSendDt(
        deviceDynamogrammPrepareCommandScheduleId,
        sendedAt,
      );
      this.logger.log(
        `(sendReadCommandToDynamograph) finished deviceId=${deviceId} commands.id=${command?.id}, device_dynamogramm_prepare_command_schedule_id=${deviceDynamogrammPrepareCommandScheduleId}`,
      );
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
