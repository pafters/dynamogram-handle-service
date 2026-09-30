import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Location } from './locations.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, nullable: false })
  name: string;

  @Column({ type: 'int4', nullable: false })
  model_id: number;

  @Column({ type: 'int4', nullable: false })
  device_type: number;

  @Column({ type: 'varchar', length: 500, nullable: false })
  address: string;

  @Column({ type: 'int4', nullable: true })
  location_id: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  guid: string | null;

  @Column({ type: 'varchar', nullable: false })
  latitude: string;

  @Column({ type: 'varchar', nullable: false })
  longitude: string;

  @Column({ type: 'int4', nullable: true })
  template_id: number | null;

  @Column({ type: 'int4', nullable: true })
  alias_template_id: number | null;

  @Column({ type: 'int4', nullable: true })
  server_alias_template_id: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  number: string | null;

  // Связь с таблицей locations
  @ManyToOne(() => Location, (location) => location.devices)
  @JoinColumn({ name: 'location_id' })
  location?: Location;
}
