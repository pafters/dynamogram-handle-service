import { Logger, Module } from '@nestjs/common';

import { SystemConfigModule } from '../system-config/system-config.module';
import { M500Service } from './m500.service';
import { M500Connection } from './m500.connection';

@Module({
  imports: [SystemConfigModule],
  providers: [Logger, M500Connection, M500Service],
  exports: [M500Service],
})
export class M500Module {}
