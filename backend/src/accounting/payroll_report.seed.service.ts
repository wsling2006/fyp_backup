import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollReport } from './payroll_report.entity';
import { Employee } from '../employees/employee.entity';
import sampleData from './payroll_report.sample.json';

@Injectable()
export class PayrollReportSeedService {
  constructor(
    @InjectRepository(PayrollReport)
    private readonly repo: Repository<PayrollReport>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Fetch all employees and build a mapping from sample key to employee UUID
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[`emp-${String(idx + 1).padStart(3, '0')}`] = emp.id;
    });
    // Filter out any invalid rows (missing employee_id, month, year, gross_salary, deductions, net_salary)
    const validData = (sampleData as any[]).filter(row =>
      row && row.employee_id && row.month && row.year && row.gross_salary !== undefined && row.deductions !== undefined && row.net_salary !== undefined
    ).map(row => ({
      ...row,
      employee_id: employeeMap[row.employee_id] || null,
    }));
    await this.repo.save(validData);
  }
}
