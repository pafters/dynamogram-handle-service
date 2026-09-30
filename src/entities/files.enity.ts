import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'bytea', nullable: false })
  blob: Buffer;

  @Column({ type: 'varchar', nullable: true })
  guid: string;
}
