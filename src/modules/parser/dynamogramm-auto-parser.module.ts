import { Logger, Module } from '@nestjs/common';

import { SystemConfigModule } from '../system-config/system-config.module';
import { DynamogrammAutoParserService } from './dynamogramm-auto-parser.service';
import { M500Module } from '../postgres/m500.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { CronModule } from '../cron/cron.module';

@Module({
  imports: [ValkeyModule, M500Module, CronModule, SystemConfigModule],
  providers: [Logger, DynamogrammAutoParserService],
})
export class DynamogrammAutoParserModule {}
