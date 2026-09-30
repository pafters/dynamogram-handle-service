import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dynamogramm_parsed_results')
export class DynamogrammParsedResults {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ type: 'time', nullable: false })
  time: string;

  @Column({ type: 'varchar', nullable: false })
  station_id: string;

  @Column({ type: 'timestamp', nullable: false })
  savetime: Date;

  @Column({ type: 'int', nullable: false })
  discr: number;

  @Column({ type: 'int', nullable: false })
  reg: number;

  @Column({ type: 'int4', nullable: true })
  points: number;

  @Column({ type: 'varchar', nullable: true })
  value: string;
}
