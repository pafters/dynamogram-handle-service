import {
  Inject,
  Injectable,
  Logger,
  LoggerService,
  // OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { checkEnvNumber } from 'src/modules/system-config/helpers/checkEnvNumber.helper';
import { checkEnvString } from 'src/modules/system-config/helpers/checkEnvString.helper';
import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { DBConfigType } from 'src/modules/system-config/types/DBConfig.type';
import { SystemCronConfigsType } from 'src/modules/system-config/types/SystemCronConfigs.type';
import { ValkeyConfigType } from 'src/modules/system-config/types/ValkeyConfig.type';
@Injectable()
export class SystemConfigService implements OnModuleInit {
  constructor(@Inject(Logger) private readonly logger: LoggerService) {
    this.logger = addContextDecoratorLogger(logger, SystemConfigService.name);
  }

  // системные крон настройки
  private cronParseNewDynamoData: string | undefined;
  private cronActualizeDynamographReadingCommandInterval: string | undefined;
  private cronDownloadFilesFromDynamographs: string | undefined;

  // настройки базы данных
  private dbHost: string | undefined;
  private dbPort: number | undefined;
  private dbUser: string | undefined;
  private dbPassword: string | undefined;
  private dbName: string | undefined;

  private valkeyHost: string | undefined;
  private valkeyPort: string | undefined;
  private valkeyDb: string | undefined;
  private valkeyAuthRequire: boolean;
  private valkeyUserName: string | undefined;
  private valkeyPassword: string | undefined;

  onModuleInit(): void {
    this.checkCronConfig();
    this.checkDatabaseConfig();
    this.checkValkeyConfig();
  }

  private checkCronConfig(): void {
    try {
      this.logger.warn('checkCronConfig is started');
      checkEnvString(
        process.env.SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA,
        'SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA',
      );
      checkEnvString(
        process.env.SYSTEM_CRON_ACTUALIZE_DYNAMOGRAPH_READING_COMMAND_INTERVAL,
        'SYSTEM_CRON_ACTUALIZE_DYNAMOGRAPH_READING_COMMAND_INTERVAL',
      );
      checkEnvString(
        process.env.SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS,
        'SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS',
      );

      // присваиваем значения если все настройки прошли проверку успешно
      this.cronParseNewDynamoData =
        process.env.SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA;

      this.cronActualizeDynamographReadingCommandInterval =
        process.env.SYSTEM_CRON_ACTUALIZE_DYNAMOGRAPH_READING_COMMAND_INTERVAL;

      this.cronDownloadFilesFromDynamographs =
        process.env.SYSTEM_CRON_DOWNLOAD_FILES_FROM_DYNAMOGRAPHS;
    } catch (e) {
      this.logger.error(`ERROR (checkCronConfig)`, e);
      throw e;
    }
  }

  get cronConfigs(): SystemCronConfigsType {
    // this.logger.warn('get cronConfigs is called');
    console.log(
      `this.cronActualizeDynamographReadingCommandInterval`,
      this.cronActualizeDynamographReadingCommandInterval,
    );
    return {
      cronParseNewDynamoData: this.cronParseNewDynamoData,

      cronActualizeDynamographReadingCommandInterval:
        this.cronActualizeDynamographReadingCommandInterval,

      cronDownloadFilesFromDynamographs: this.cronDownloadFilesFromDynamographs,
    };
  }

  // Настройки подключения к базе данных
  private checkDatabaseConfig(): void {
    this.logger.warn('checkDatabaseConfig is started');
    try {
      checkEnvString(process.env.DB_HOST, 'DB_HOST');
      checkEnvNumber(process.env.DB_PORT, 'DB_PORT');
      checkEnvString(process.env.DB_USER, 'DB_HOST');
      checkEnvString(process.env.DB_PASSWORD, 'DB_HOST');
      checkEnvString(process.env.DB_NAME, 'DB_HOST');

      this.dbHost = process.env.DB_HOST;
      this.dbPort = Number(process.env.DB_PORT);
      this.dbUser = process.env.DB_USER;
      this.dbPassword = process.env.DB_PASSWORD;
      this.dbName = process.env.DB_NAME;
    } catch (e) {
      this.logger.error(`ERROR (checkDatabaseConfig): `, e);
      throw e;
    }
  }

  get postgresConfig(): DBConfigType {
    // this.logger.warn('get postgresConfig is called');
    return {
      host: this.dbHost,
      port: this.dbPort,
      username: this.dbUser,
      password: this.dbPassword,
      database: this.dbName,
    };
  }

  // настройки подключения к valkey
  private checkValkeyConfig(): void {
    this.logger.warn('checkValkeyConfig is started');
    try {
      const valkeyRequire = process.env.VALKEY_AUTH_REQUIRE === 'true';
      checkEnvString(process.env.VALKEY_HOST, 'VALKEY_HOST');
      checkEnvNumber(process.env.VALKEY_PORT, 'VALKEY_PORT');
      checkEnvNumber(process.env.VALKEY_DB, 'VALKEY_DB');
      if (this.valkeyAuthRequire === true) {
        checkEnvString(process.env.VALKEY_USERNAME, 'VALKEY_USERNAME');
        checkEnvString(process.env.VALKEY_PASSWORD, 'VALKEY_PASSWORD');
      }

      this.valkeyAuthRequire = valkeyRequire;
      this.valkeyHost = process.env.VALKEY_HOST;
      this.valkeyPort = process.env.VALKEY_PORT;
      this.valkeyDb = process.env.VALKEY_DB;
      this.valkeyUserName = process.env.VALKEY_USERNAME;
      this.valkeyPassword = process.env.VALKEY_PASSWORD;
    } catch (e) {
      this.logger.error(`ERROR (checkValkeyConfig): `, e);
      throw e;
    }
  }

  get valkeyConfig(): ValkeyConfigType {
    // this.logger.warn('get valkeyConfig is called');
    const config: ValkeyConfigType = {
      host: this.valkeyHost,
      port: Number(this.valkeyPort),
      db: Number(this.valkeyDb),
    };
    if (this.valkeyAuthRequire) {
      config.username = this.valkeyUserName;
      config.password = this.valkeyPassword;
    }
    return config;
  }
}
