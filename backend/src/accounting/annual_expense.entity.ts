import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('annual_expenses')
export class AnnualExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  year: number;

  @Column()
  category: string;

  @Column('decimal')
  amount: number;

  @Column('text')
  notes: string;
}
