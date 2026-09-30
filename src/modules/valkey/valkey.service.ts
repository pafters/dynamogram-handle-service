import { Inject, Injectable, Logger, LoggerService } from '@nestjs/common';
import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { ValkeyConnection } from './valkey.connection';

import { ValkeyItemType } from 'src/types/ValkeyItem.type';

@Injectable()
export class ValkeyService {
  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly valkeyConn: ValkeyConnection,
  ) {
    this.logger = addContextDecoratorLogger(logger, ValkeyService.name);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const answer = await this.valkeyConn.valkeyClient.ping();
      return answer === 'PONG';
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  async getValueByKey(key: string): Promise<ValkeyItemType | null> {
    try {
      const type = await this.valkeyConn.valkeyClient.type(key);

      if (type !== 'string') {
        throw new Error(
          `getValueKey Failed With incorrect type=${type} for polling data key=${key}. Expected type='string'`,
        );
      }
      const value = await this.valkeyConn.valkeyClient.get(key);
      if (value) {
        const parsedData: ValkeyItemType = JSON.parse(value) as ValkeyItemType;
        return parsedData;
      }
      return null;
    } catch {
      // this.logger.error(error);
      return null;
    }
  }

  async getAllValuesForKeys(keys: string[]): Promise<ValkeyItemType[]> {
    try {
      const result: ValkeyItemType[] = [];

      const values = await this.valkeyConn.valkeyClient.mget(keys);

      const cleanValues = values.filter((item) => item !== null);

      cleanValues.forEach((item: string) => {
        try {
          const resultValue = JSON.parse(item) as ValkeyItemType;
          result.push(resultValue);
        } catch {
          // only for trace
          // this.logger.error('Error While processing parse valkey data' + e, item);
        }
      });
      return result;
    } catch (e) {
      this.logger.error('Error While processing getAllValuesForKeys', e);
      return [];
    }
  }
}
