import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payroll_reports')
export class PayrollReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  employee_id: string;

  @Column()
  month: string;

  @Column()
  year: number;

  @Column('decimal')
  gross_salary: number;

  @Column('decimal')
  deductions: number;

  @Column('decimal')
  net_salary: number;
}
