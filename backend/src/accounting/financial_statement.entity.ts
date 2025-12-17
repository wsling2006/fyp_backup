import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('financial_statements')
export class FinancialStatement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  year: number;

  @Column()
  statement_type: string;

  @Column('text')
  file_path: string;

  @Column('uuid')
  uploaded_by: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploaded_at: Date;
}
