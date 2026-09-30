import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dynamogramm_parsed_results_attempt')
export class DynamogrammParsedResultsAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int8', nullable: false })
  command_spec_history_id: number;

  @Column({ type: 'int4', nullable: true })
  dynamogramm_parsed_results_id: number;

  @Column({ type: 'varchar', nullable: false })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  error_description: string;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  created_at: Date;
}
