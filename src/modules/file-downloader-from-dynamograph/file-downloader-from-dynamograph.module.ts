import { Logger, Module } from '@nestjs/common';

import { M500Module } from '../postgres/m500.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { CronModule } from '../cron/cron.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { FileDownloaderFromDynamographService } from './file-downloader-from-dynamograph.service';

@Module({
  imports: [ValkeyModule, M500Module, CronModule, SystemConfigModule],
  providers: [Logger, FileDownloaderFromDynamographService],
})
export class FileDownloaderFromDynamographModule {}
