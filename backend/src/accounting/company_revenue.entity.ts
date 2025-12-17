import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('company_revenue')
export class CompanyRevenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  year: number;

  @Column()
  quarter: string;

  @Column('decimal')
  revenue: number;

  @Column('text')
  notes: string;
}
