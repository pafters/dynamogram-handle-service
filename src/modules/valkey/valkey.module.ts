import { Logger, Module } from '@nestjs/common';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ValkeyConnection } from './valkey.connection';
import { ValkeyService } from './valkey.service';

@Module({
  imports: [SystemConfigModule],
  providers: [Logger, ValkeyConnection, ValkeyService],
  exports: [ValkeyService],
})
export class ValkeyModule {}
