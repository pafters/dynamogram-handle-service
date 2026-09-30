import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dynamogramm_creating_files_on_devices_log')
export class DynamogrammCreatingFilesOnDevicesLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int4', nullable: false })
  device_id: number;

  @Column({ type: 'int8', nullable: false })
  last_file_creation_unixtime_dt: number;

  @Column({ type: 'timestamptz', nullable: false })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: false })
  updated_at: Date;
}
