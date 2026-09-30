import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('device_dynamogramm_prepare_command_schedule')
export class DeviceDynamogrammPrepareCommandSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int4', nullable: false })
  device_id: number;

  @Column({ type: 'varchar', nullable: false })
  cron_timer: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_command_send_dt: Date;

  @Column({ type: 'varchar', nullable: false })
  timezone: string;
}
