import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './devices.entity';
// import { Site } from './sites.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, nullable: false })
  name: string;

  @Column({ type: 'int4', nullable: false })
  site_id: number;

  @Column({ type: 'int4', nullable: true })
  location_id: number;

  @Column({ type: 'varchar', nullable: false })
  back: string;

  @Column({ type: 'int4', nullable: true })
  location_type: number | null;

  @Column({ type: 'int4', nullable: false })
  location_view_type: number;

  @Column({ type: 'varchar', nullable: false })
  longitude: string;

  @Column({ type: 'varchar', nullable: false })
  latitude: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @OneToMany(() => Device, (device) => device.location)
  devices: Device[];
}
