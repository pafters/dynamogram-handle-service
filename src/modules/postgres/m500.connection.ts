import { DataSource, Repository } from 'typeorm';
import {
  Inject,
  Injectable,
  Logger,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { SystemConfigService } from '../system-config/system-config.service';
import { File } from 'src/entities/files.enity';
import { CommandSpecHistory } from 'src/entities/command_spec_history.entity';
import { DynamogrammParsedResultsAttempt } from 'src/entities/dynamogramm_parsed_result_attempts.enity';
import { DynamogrammParsedResults } from 'src/entities/dynamogramm_parsed_results.enity';
import { Device } from 'src/entities/devices.entity';
import { Location } from 'src/entities/locations.entity';
import { DeviceDynamogrammPrepareCommandSchedule } from 'src/entities/device_dynamogramm_prepare_command_schedule.entity';
import { ServerModemDeviceBinds } from 'src/entities/server_modem_device_binds.entity';
import { DynamogrammCreatingFilesOnDevicesLog } from 'src/entities/dynamogramm_creating_files_on_devices_log.entity';
import { Commands } from 'src/entities/commands.entity';
import { CommandsSpec } from 'src/entities/command_spec.entity';

@Injectable()
export class M500Connection implements OnModuleInit, OnModuleDestroy {
  private postgres: DataSource;

  public fileRepository: Repository<File>;
  public deviceRepository: Repository<Device>;
  public locationRepository: Repository<Location>;
  public commandSpecHistoryRepository: Repository<CommandSpecHistory>;
  public commandsSpecRepository: Repository<CommandsSpec>;
  public dynamogrammParsedResultsAttemptRepository: Repository<DynamogrammParsedResultsAttempt>;
  public dynamogrammParsedResultsRepository: Repository<DynamogrammParsedResults>;
  public deviceDynamogrammPrepareCommandScheduleRepository: Repository<DeviceDynamogrammPrepareCommandSchedule>;
  public serverModemDeviceBindsRepository: Repository<ServerModemDeviceBinds>;
  public dynamogrammCreatingFilesOnDevicesLogRepository: Repository<DynamogrammCreatingFilesOnDevicesLog>;
  public commandsRepository: Repository<Commands>;

  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly systemConfig: SystemConfigService,
  ) {
    this.logger = addContextDecoratorLogger(logger, M500Connection.name);
  }

  async onModuleInit(): Promise<void> {
    this.init();
    this.logger.log('POSTGRESQL connecting...');
    await this.connect();
    this.logger.log('POSTGRESQL connection SUCCESS');

    this.fileRepository = this.postgres.getRepository(File);
    this.deviceRepository = this.postgres.getRepository(Device);
    this.locationRepository = this.postgres.getRepository(Location);
    this.commandSpecHistoryRepository =
      this.postgres.getRepository(CommandSpecHistory);
    this.dynamogrammParsedResultsAttemptRepository =
      this.postgres.getRepository(DynamogrammParsedResultsAttempt);
    this.dynamogrammParsedResultsRepository = this.postgres.getRepository(
      DynamogrammParsedResults,
    );
    this.deviceDynamogrammPrepareCommandScheduleRepository =
      this.postgres.getRepository(DeviceDynamogrammPrepareCommandSchedule);
    this.serverModemDeviceBindsRepository = this.postgres.getRepository(
      ServerModemDeviceBinds,
    );
    this.dynamogrammCreatingFilesOnDevicesLogRepository =
      this.postgres.getRepository(DynamogrammCreatingFilesOnDevicesLog);

    this.commandsRepository = this.postgres.getRepository(Commands);

    this.commandsSpecRepository = this.postgres.getRepository(CommandsSpec);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('POSTGRESQL disconnecting...');
    await this.postgres.destroy();
    this.logger.log('POSTGRESQL DISCONNECTED');
  }

  private init() {
    this.logger.log('POSTGRESQL initing...');

    this.postgres = new DataSource({
      type: 'postgres',
      ...this.systemConfig.postgresConfig,
      synchronize: false, // !!! при значении true таблица в базе данных перезапишется под структуру модели в коде. Влечет потери данных и связей
      entities: [
        File,
        CommandSpecHistory,
        DynamogrammParsedResultsAttempt,
        DynamogrammParsedResults,
        Device,
        Location,
        DeviceDynamogrammPrepareCommandSchedule,
        ServerModemDeviceBinds,
        DynamogrammCreatingFilesOnDevicesLog,
        Commands,
        CommandsSpec,
      ],
    });

    this.logger.log('POSTGRESQL inited');
  }

  private async connect(): Promise<void> {
    this.logger.log('POSTGRESQL connecting...');
    await this.postgres.initialize();
    this.logger.log('POSTGRESQL connection SUCCESS');
    // this.liveRepository = postgres.getRepository(Live);
  }

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const answer = await this.postgres.query(sql, params);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return answer ?? [];
    } catch (e) {
      this.logger.error(e);
      return [];
    }
  }
}
