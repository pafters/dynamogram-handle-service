import {
  Inject,
  Injectable,
  Logger,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class ValkeyConnection implements OnModuleInit, OnModuleDestroy {
  public valkeyClient: Redis;

  constructor(
    @Inject(Logger) private readonly logger: LoggerService,
    private readonly systemConfig: SystemConfigService,
  ) {
    this.logger = addContextDecoratorLogger(logger, ValkeyConnection.name);
  }

  onModuleInit() {
    this.init();
    this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.valkeyClient.quit();
    this.logger.log('Valkey: DISCONNECTED');
  }

  private init(): void {
    this.valkeyClient = new Redis(this.systemConfig.valkeyConfig);
  }

  private connect(): void {
    this.valkeyClient.on('connect', () => {
      this.logger.log('Valkey: CONNECTION SUCCESS IN ValkeyConnection');
    });
  }
}
