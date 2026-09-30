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
import { convertBufferToDynamoValue } from 'src/modules/parser/helpers/convertValue.helper';
import { DynamogrammParsedResultsAttemptQuery } from 'src/types/DynamogrammParsedResultsAttemptQuery.type';
import { DynamogrammParsedResultsQuery } from 'src/types/DynamogrammParsedResultsQuery.type';
import { checkParsedAndSpecDataOnError } from 'src/modules/parser/helpers/checkParsedDataOnError.helper';
import { DynamoValueType } from 'src/types/DynamoValue.type';
import { CommandSpecHistoryWithBufferDataType } from 'src/types/CommandSpecHistoryWithBufferData.type';
import { CronService } from '../cron/cron.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ALIASES } from 'src/constants/aliases';
import { DynamogrammParsedResultsAttempt } from 'src/entities/dynamogramm_parsed_result_attempts.enity';

@Injectable()
export class DynamogrammAutoParserService implements OnApplicationBootstrap {
  private parsingIsActive: boolean = false;

  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly m500Service: M500Service,
    private readonly valkeyService: ValkeyService,
    private readonly systemConfig: SystemConfigService,
    private readonly cronService: CronService,
  ) {
    this.logger = addContextDecoratorLogger(
      logger,
      DynamogrammAutoParserService.name,
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.parseNewDynamoFiles();
    this.initCronScheduleForParseData();
  }

  /* Настройки крона */
  initCronScheduleForParseData(): void {
    // перед запуском крона проверяем на существование настроек вызова
    if (this.systemConfig.cronConfigs.cronParseNewDynamoData === undefined) {
      throw new Error(
        'SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA is invalid or does not exist in env file',
      );
    }
    this.cronService.addCronJob(
      'SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA',
      this.systemConfig.cronConfigs.cronParseNewDynamoData,
      async () => {
        await this.parseNewDynamoFiles();
      },
    );
    this.logger.warn(
      `(initCronScheduleForParseData) the cron "SYSTEM_CRON_PARSE_NEW_DYNAMO_DATA" with config "${this.systemConfig.cronConfigs.cronParseNewDynamoData}" inited`,
    );
  }
  /* Конец настройки крона */

  async checkConnections(): Promise<boolean> {
    const valkeyIsConnected = await this.valkeyService.checkConnection();
    if (valkeyIsConnected === false) {
      this.logger.error('(checkConnections) ERROR VALKEY IS NOT ONLINE');
      return false;
    }

    const dbIsConnected = await this.m500Service.checkConnection();
    if (dbIsConnected === false) {
      this.logger.error('(checkConnections) ERROR VALKEY IS NOT ONLINE');
      return false;
    }

    return true;
  }

  async parseNewDynamoFiles(): Promise<void> {
    try {
      const resourcesAreConnected = await this.checkConnections();
      if (resourcesAreConnected === false) {
        this.logger.error(
          '(parseNewDynamoFiles) finished with ERROR cause DATABASE OR VALKEY is not connected',
        );
        return;
      }
      if (this.parsingIsActive === true) {
        this.logger.warn('(parseNewDynamoFiles) is already processing');
        return;
      }

      this.logger.log('(parseNewDynamoFiles) is started');
      this.parsingIsActive = true;
      const files = await this.m500Service.getFilesData();
      const promises = files.map(async (dynamo) => {
        try {
          // преобразовываем данные в нужный вид
          const parsedData = convertBufferToDynamoValue(dynamo.data);
          // проверяем данные
          checkParsedAndSpecDataOnError(parsedData, dynamo);

          // вносим записи
          this.logger.log(
            `(parseNewDynamoFiles) inserting data command_spec_history_id=${dynamo.id}`,
          );
          const answer = await this.insertData(parsedData, dynamo);
          if (answer) {
            this.logger.log(
              `(parseNewDynamoFiles) inserted data into dynamogramm_parsed_results_attempt the item with command_spec_history_id=${dynamo.id} dynamogramm_parsed_results_attempt.id=${answer.attemptItemId} dynamogramm_parsed_results.id=${answer.resultParsedItemId}`,
            );
          }
        } catch (e) {
          let errorMessage: string | undefined = undefined;
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          // логируем ошибку
          this.logger.error(
            `(parseNewDynamoFiles) ERROR FOR command_spec_history_id=${dynamo.id}:`,
            e,
          );
          // логируем ошибку в attempt
          const answer = await this.logErrorIntoAttempt(
            dynamo.id,
            errorMessage,
          );
          this.logger.log(
            `(parseNewDynamoFiles) insert data command_spec_history_id=${dynamo.id} dynamogramm_parsed_results_attempt.id=${answer.id}`,
          );
        }
      });

      await Promise.all(promises);
    } catch (e) {
      this.logger.error(`(parseNewDynamoFiles) error`, e);
    } finally {
      this.parsingIsActive = false;
      this.logger.log('(parseNewDynamoFiles) finished');
    }
  }

  async insertData(
    parsedData: DynamoValueType,
    spec: CommandSpecHistoryWithBufferDataType,
  ): Promise<{ resultParsedItemId: number; attemptItemId: number }> {
    // подготавливаем данные к внесению в результирующую таблицу
    const locationName = await this.m500Service.getLocationByDeviceId(
      spec.device_id,
    );
    const discrInfo = await this.valkeyService.getValueByKey(
      `device/${spec.device_id}/${ALIASES.POINT_DISCR}`,
    );

    if (
      !discrInfo ||
      discrInfo.value === null ||
      isNaN(Number(discrInfo.value)) ||
      discrInfo.value === 0
    ) {
      throw new Error(
        `(insertData) discr is invalid (discr = "${discrInfo?.value}") for command_spec_history_id="${spec.id}" device_id="${spec.device_id}"`,
      );
    }

    const resultQuery = {
      points: parsedData.points,
      date: parsedData.date,
      time: parsedData.time,
      station_id: locationName, //получить location.name
      savetime: new Date(spec.dt_response),
      discr: Math.round(1000 * (1 / discrInfo.value)), //возьмется из valkey
      reg: 1, // константа
      value: parsedData.valueArray.join(','),
    } as DynamogrammParsedResultsQuery;

    // вносим в результирующую таблицу dynamogramm_parsed_results_id и получаем id созданной записи
    const resultParsedItem =
      await this.m500Service.insertResultDynamoData(resultQuery);

    if (resultParsedItem === undefined) {
      throw new Error('(insertData) resultParsedItem is undefined');
    }

    this.logger.log(
      `(insertData) inserted into table "dynamogramm_parsed_results" the item with id="${resultParsedItem.id}" and station_id="${resultParsedItem.station_id}"`,
    );

    // вносим лог в таблицу attempt, ставим status 'success' и dynamogramm_parsed_results_id = id созданной записи
    const attemptQuery: DynamogrammParsedResultsAttemptQuery = {
      command_spec_history_id: spec.id,
      dynamogramm_parsed_results_id: resultParsedItem.id,
      status: 'success',
      error_description: undefined,
      created_at: new Date(),
    };
    // добавляем в attempt запись и получаем этой записи id
    const attemptItem =
      await this.m500Service.insertAttemptDynamoData(attemptQuery);

    this.logger.log(
      `(insertData) inserted into table "dynamogramm_parsed_results_attempt" the item with id="${resultParsedItem.id}" and station_id="${resultParsedItem.station_id}"`,
    );

    return {
      resultParsedItemId: resultParsedItem?.id,
      attemptItemId: attemptItem?.id,
    };
  }

  async logErrorIntoAttempt(
    command_spec_history_id: number,
    errorMessage: string | undefined,
  ): Promise<DynamogrammParsedResultsAttempt> {
    const attemptQuery: DynamogrammParsedResultsAttemptQuery = {
      command_spec_history_id: command_spec_history_id,
      dynamogramm_parsed_results_id: undefined,
      status: 'error',
      error_description: errorMessage,
      created_at: new Date(),
    };
    return await this.m500Service.insertAttemptDynamoData(attemptQuery);
  }
}
