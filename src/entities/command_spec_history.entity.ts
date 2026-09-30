import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('command_spec_history')
export class CommandSpecHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int4', nullable: false })
  server_id: number;

  @Column({ type: 'int4', nullable: true })
  modem_id: number;

  @Column({ type: 'int4', nullable: true })
  device_id: number;

  @Column({ type: 'varchar', nullable: false })
  topic: string;

  @Column({ type: 'varchar', nullable: true })
  value: string;

  @Column({ type: 'int4', nullable: true })
  user_id: number;

  @Column({ type: 'timestamptz', nullable: false })
  dt: Date;

  @Column({ type: 'varchar', nullable: true })
  guid: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  dt_response: Date;

  @Column({ type: 'varchar', nullable: true })
  response: string;

  @Column({ type: 'varchar', nullable: true })
  error: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  addon: string;

  @Column({ type: 'int4', nullable: true })
  progress: number;
}
