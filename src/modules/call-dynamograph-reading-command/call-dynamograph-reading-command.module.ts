import { Logger, Module } from '@nestjs/common';
import { CallDynamographReadingCommandService } from './call-dynamograph-reading-command.service';
import { ValkeyModule } from '../valkey/valkey.module';
import { M500Module } from '../postgres/m500.module';
import { CronModule } from '../cron/cron.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [ValkeyModule, M500Module, CronModule, SystemConfigModule],
  providers: [Logger, CallDynamographReadingCommandService],
})
export class CallDynamographReadingCommandModule {}
