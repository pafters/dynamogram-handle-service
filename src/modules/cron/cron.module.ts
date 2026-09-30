import { Logger, Module } from '@nestjs/common';

import { CronService } from './cron.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [Logger, CronService],
  exports: [CronService],
})
export class CronModule {}
