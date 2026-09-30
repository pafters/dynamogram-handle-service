import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commands_spec')
export class CommandsSpec {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  value: string;

  @Column({ type: 'timestamptz', nullable: false })
  dt: Date;

  @Column({ type: 'int4', nullable: false })
  user_id: number;

  @Column({ type: 'int4', nullable: true })
  device_id: number;

  @Column({ type: 'int4', nullable: false })
  modem_id: number;

  @Column({ type: 'int4', nullable: false })
  server_id: number;

  @Column({ type: 'varchar', nullable: false })
  guid: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  name: string;

  @Column({ type: 'varchar', nullable: false, default: 'modem' })
  topic: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  addon: string;
}
