import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialStatement } from './financial_statement.entity';
import { Employee } from '../employees/employee.entity';
import sampleData from './financial_statement.sample.json';

@Injectable()
export class FinancialStatementSeedService {
  constructor(
    @InjectRepository(FinancialStatement)
    private readonly repo: Repository<FinancialStatement>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Fetch all employees and build a mapping from sample key to employee UUID
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[`user-uuid-${idx + 1}`] = emp.id;
    });
    // Filter out any invalid rows (missing year, statement_type, file_path, uploaded_by, uploaded_at)
    const validData = (sampleData as any[]).filter(row =>
      row && row.year && row.statement_type && row.file_path && row.uploaded_by && row.uploaded_at
    ).map(row => ({
      ...row,
      uploaded_by: employeeMap[row.uploaded_by] || null,
    }));
    await this.repo.save(validData);
  }
}
