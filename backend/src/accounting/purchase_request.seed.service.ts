import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseRequest } from './purchase_request.entity';
import { Employee } from '../employees/employee.entity';
import sampleData from './purchase_request.sample.json';

@Injectable()
export class PurchaseRequestSeedService {
  constructor(
    @InjectRepository(PurchaseRequest)
    private readonly repo: Repository<PurchaseRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Fetch all employees and build a mapping from sample key to employee UUID
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[`user-sales-${String(idx + 1).padStart(3, '0')}`] = emp.id;
      employeeMap[`user-marketing-${String(idx + 1).padStart(3, '0')}`] = emp.id;
    });
    // Filter out any invalid rows (missing requester_id, item_name, quantity, cost, status, created_at)
    const validData = (sampleData as any[]).filter(row =>
      row && row.requester_id && row.item_name && row.quantity !== undefined && row.cost !== undefined && row.status && row.created_at
    ).map(row => ({
      ...row,
      requester_id: employeeMap[row.requester_id] || null,
    }));
    await this.repo.save(validData);
  }
}
