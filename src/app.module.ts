import { Logger, Module } from '@nestjs/common';
import { envPathProvider } from './infrastructure/env.path.provider';
import { ScheduleModule } from '@nestjs/schedule';
import { ValkeyModule } from './modules/valkey/valkey.module';
import { M500Module } from './modules/postgres/m500.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { DynamogrammAutoParserModule } from './modules/parser/dynamogramm-auto-parser.module';
import { ConfigModule } from '@nestjs/config';
import { CronModule } from './modules/cron/cron.module';
import { CallDynamographReadingCommandModule } from './modules/call-dynamograph-reading-command/call-dynamograph-reading-command.module';
import { FileDownloaderFromDynamographModule } from './modules/file-downloader-from-dynamograph/file-downloader-from-dynamograph.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: envPathProvider(),
      isGlobal: true,
    }),
    SystemConfigModule,
    ScheduleModule.forRoot(),
    ValkeyModule,
    M500Module,
    CronModule,
    DynamogrammAutoParserModule,
    CallDynamographReadingCommandModule,
    FileDownloaderFromDynamographModule,
  ],
  controllers: [],
  providers: [Logger],
})
export class AppModule {}
