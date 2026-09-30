import { Inject, Injectable, Logger, LoggerService } from '@nestjs/common';

import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { M500Connection } from './m500.connection';
import { In, UpdateResult } from 'typeorm';
import { CommandSpecHistory } from 'src/entities/command_spec_history.entity';
import { CommandSpecHistoryWithBufferDataType } from 'src/types/CommandSpecHistoryWithBufferData.type';
import { DynamogrammParsedResultsAttempt } from 'src/entities/dynamogramm_parsed_result_attempts.enity';
import { DynamogrammParsedResultsAttemptQuery } from 'src/types/DynamogrammParsedResultsAttemptQuery.type';
import { DynamogrammParsedResults } from 'src/entities/dynamogramm_parsed_results.enity';
import { DynamogrammParsedResultsQuery } from 'src/types/DynamogrammParsedResultsQuery.type';
import { DeviceDynamogrammPrepareCommandSchedule } from 'src/entities/device_dynamogramm_prepare_command_schedule.entity';
import { Device } from 'src/entities/devices.entity';
import { ServerModemDeviceBinds } from 'src/entities/server_modem_device_binds.entity';
import { CommandSpecQueryType } from 'src/modules/postgres/types/CommandSpecQuery.type';
import { DynamogrammCreatingFilesOnDevicesLog } from 'src/entities/dynamogramm_creating_files_on_devices_log.entity';
import { DynamogrammCreatingFilesOnDevicesLogQueryType } from 'src/modules/postgres/types/DynamogrammCreatingFilesOnDevicesLogQuery.type';
import { CommandsItemQueryType } from 'src/modules/postgres/types/CommandsItemQuery.type';
import { ALIASES } from 'src/constants/aliases';
import * as crypto from 'node:crypto';
import { Commands } from 'src/entities/commands.entity';
import { CommandsSpec } from 'src/entities/command_spec.entity';
import { STRING_DYNAMO_ADDON } from 'src/constants/addon';

@Injectable()
export class M500Service {
  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly m500Connection: M500Connection,
  ) {
    this.logger = addContextDecoratorLogger(logger, M500Service.name);
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.m500Connection.query('SELECT version()');
      return true;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  // список команд, которые уже успешно создали файлы динамограмм, и которые не были обработаны парсером
  async getUnparsedFilesCommands(): Promise<CommandSpecHistory[]> {
    try {
      const addonPrefix = ['%dmg_%', '%vdmg_%'];

      const params = ['File_x64', 'EOF', 0, 'success', addonPrefix];

      const sql = `
    SELECT csh.* 
      FROM command_spec_history csh 
    LEFT JOIN dynamogramm_parsed_results_attempt attempt ON csh.id = attempt.command_spec_history_id
    WHERE csh.topic = $1
      AND csh.value != $2
      AND csh.progress > $3
      AND csh.status = $4
      AND (csh.addon LIKE ANY($5))
      AND attempt.id IS NULL
    `;
      return (await this.m500Connection.query(
        sql,
        params,
      )) as CommandSpecHistory[];
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getLocationByDeviceId(deviceId: number): Promise<string> {
    try {
      const data = await this.m500Connection.deviceRepository.find({
        where: { id: deviceId },
        relations: ['location'],
      });

      if (!data || !data[0]) {
        throw new Error(
          `(getLocationByDeviceId) устройство не найдено с device_id = "${deviceId}"`,
        );
      }
      const device = data[0];
      if (!device.location) {
        this.logger.warn(`Нет связанной локации для device_id = ${deviceId}`);
        return '';
      }

      return device.location.name;
    } catch (e) {
      this.logger.error(e);
      throw e; // или вернуть что-то по умолчанию
    }
  }

  async getFilesData(): Promise<CommandSpecHistoryWithBufferDataType[]> {
    try {
      const specs =
        (await this.getUnparsedFilesCommands()) as CommandSpecHistoryWithBufferDataType[];

      if (specs.length === 0) {
        this.logger.log(
          'Command spec history of created dynamo files with status "success" not found',
        );
        return [];
      }

      const listguid = specs.map((file) => file.guid);

      const files = await this.m500Connection.fileRepository.find({
        where: { guid: In(listguid) },
      });

      if (files.length === 0) {
        this.logger.log('Files not found');
        return [];
      }

      specs.forEach((cpecfile) => {
        const file = files.find((f) => f.guid == cpecfile.guid);
        const blob = file ? file.blob : [];
        const convertedValue = Buffer.from(blob);
        cpecfile.data = convertedValue;
      });

      const existFiles = specs.filter((sf) => sf.data.length > 0);

      existFiles.sort((a, b) => {
        if (
          new Date(a.dt_response).valueOf() > new Date(b.dt_response).valueOf()
        )
          return -1;
        if (
          new Date(a.dt_response).valueOf() < new Date(b.dt_response).valueOf()
        )
          return 1;
        return 0;
      });

      return existFiles;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async insertAttemptDynamoData(
    data: DynamogrammParsedResultsAttemptQuery,
  ): Promise<DynamogrammParsedResultsAttempt> {
    try {
      const query =
        this.m500Connection.dynamogrammParsedResultsAttemptRepository.create(
          data,
        );
      const item =
        await this.m500Connection.dynamogrammParsedResultsAttemptRepository.save(
          query,
        );
      return item;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async insertResultDynamoData(
    data: DynamogrammParsedResultsQuery,
  ): Promise<DynamogrammParsedResults> {
    try {
      const query =
        this.m500Connection.dynamogrammParsedResultsRepository.create(data);
      const item =
        await this.m500Connection.dynamogrammParsedResultsRepository.save(
          query,
        );
      return item;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getAllDeviceDynamogrammCommandSchedules(): Promise<
    DeviceDynamogrammPrepareCommandSchedule[]
  > {
    try {
      const deviceDynamogrammCommandSchedules =
        await this.m500Connection.deviceDynamogrammPrepareCommandScheduleRepository.find(
          {},
        );
      return deviceDynamogrammCommandSchedules;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async updateLastReadCommandToDynamographSendDt(
    deviceDynamogrammPrepareCommandScheduleId: number,
    sendedAt: Date,
  ): Promise<void> {
    try {
      await this.m500Connection.deviceDynamogrammPrepareCommandScheduleRepository.update(
        deviceDynamogrammPrepareCommandScheduleId,
        {
          last_command_send_dt: sendedAt,
          // другие поля
        },
      );
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getDevices(): Promise<Device[]> {
    try {
      const devices = await this.m500Connection.deviceRepository.find({
        where: {},
      });
      return devices;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getModemDeviceBindByDeviceId(
    deviceId: number,
  ): Promise<ServerModemDeviceBinds | null> {
    try {
      const bind =
        this.m500Connection.serverModemDeviceBindsRepository.findOneBy({
          device_id: deviceId,
        });
      return bind;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async sendReadCommandToDynamograph(
    deviceId: number,
    modemId: number,
  ): Promise<Commands> {
    const payload: CommandsItemQueryType = {
      device_id: deviceId,
      modem_id: modemId,
      server_alias: ALIASES.DYNACARD_RECORD,
      old_value: undefined,
      new_value: '#ДИНАМОГРАММА',
      user_id: -2,
      dt: new Date(),
      server_id: 1,
      guid: crypto.randomUUID(),
    };
    // поменять на commandsRepository
    const query = this.m500Connection.commandsRepository.create(payload);
    const item = await this.m500Connection.commandsRepository.save(query);
    this.logger.warn(
      `(sendReadCommandToDynamograph) added in table named "commands" the item id ="${item.id}", guid="${payload.guid}", device_id=${deviceId} and alias="${ALIASES.DYNACARD_RECORD}", new_value=${payload.new_value}`,
    );
    return item;
  }

  async sendDownloadDynamoFileFromDeviceToServerCommand(
    deviceId: number,
    modemId: number,
  ): Promise<CommandsSpec> {
    try {
      if (!deviceId || !modemId) {
        throw new Error(
          `(sendDownloadDynamoFileFromDeviceToServerCommand) device_id or modem_id is undefined VALUES (${deviceId},${modemId})`,
        );
      }
      const payload: CommandSpecQueryType = {
        device_id: deviceId,
        modem_id: modemId,
        server_id: 1,
        topic: 'File_x64',
        value: '16000::6',
        user_id: -2,
        dt: new Date(),
        name: '',
        guid: crypto.randomUUID(),
        addon: STRING_DYNAMO_ADDON,
      };
      const query = this.m500Connection.commandsSpecRepository.create(payload);
      const item = await this.m500Connection.commandsSpecRepository.save(query);
      this.logger.warn(
        `(sendDownloadDynamoFileFromDeviceToServerCommand) added in table named "commands_spec" the item id ="${item.id}", guid="${payload.guid}", device_id=${deviceId}"`,
      );
      return item;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async saveCreatingFileDynamoInfoLog(
    deviceId: number,
    last_file_creation_unixtime_dt: number,
  ): Promise<DynamogrammCreatingFilesOnDevicesLog | UpdateResult> {
    try {
      const existDownloadItem =
        await this.m500Connection.dynamogrammCreatingFilesOnDevicesLogRepository.findOneBy(
          { device_id: deviceId },
        );

      //обновить запись если существует
      if (existDownloadItem) {
        const payload: DynamogrammCreatingFilesOnDevicesLogQueryType = {
          device_id: deviceId,
          last_file_creation_unixtime_dt: last_file_creation_unixtime_dt,
          updated_at: new Date(),
        };

        return await this.m500Connection.dynamogrammCreatingFilesOnDevicesLogRepository.update(
          existDownloadItem.id,
          payload,
        );
      }

      // внести запись если не было ранее добавлена
      const payload: DynamogrammCreatingFilesOnDevicesLogQueryType = {
        device_id: deviceId,
        last_file_creation_unixtime_dt: last_file_creation_unixtime_dt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const query =
        this.m500Connection.dynamogrammCreatingFilesOnDevicesLogRepository.create(
          payload,
        );
      return await this.m500Connection.dynamogrammCreatingFilesOnDevicesLogRepository.save(
        query,
      );
    } catch (e) {
      this.logger.error(`(saveCreatingFileDynamoInfoLog) ERROR:`, e);
      throw e;
    }
  }

  async getDynamogrammCreatingFilesOnDevicesLog(): Promise<
    DynamogrammCreatingFilesOnDevicesLog[]
  > {
    try {
      const logs =
        await this.m500Connection.dynamogrammCreatingFilesOnDevicesLogRepository.find(
          { where: {} },
        );
      if (!logs) {
        throw new Error(
          '(getDynamogrammCreatingFilesOnDevicesLog) logs is undefined',
        );
      }
      return logs;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
