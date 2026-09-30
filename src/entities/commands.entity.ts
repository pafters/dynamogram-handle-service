import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commands')
export class Commands {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int4', nullable: true })
  modem_id: number;

  @Column({ type: 'int4', nullable: false })
  device_id: number;

  @Column({ type: 'varchar', nullable: false })
  server_alias: string;

  @Column({ type: 'varchar', nullable: true })
  old_value: string;

  @Column({ type: 'varchar', nullable: false })
  new_value: string;

  @Column({ type: 'int4', nullable: false })
  user_id: number;

  @Column({ type: 'timestamptz', nullable: false })
  dt: Date;

  @Column({ type: 'int4', nullable: true })
  server_id: number;

  @Column({ type: 'varchar', nullable: true })
  guid: string;
}
