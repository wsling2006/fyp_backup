import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cash_flow')
export class CashFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  month: string;

  @Column()
  year: number;

  @Column('decimal')
  cash_in: number;

  @Column('decimal')
  cash_out: number;

  @Column('decimal')
  net_cash: number;

  @Column('text')
  notes: string;
}
