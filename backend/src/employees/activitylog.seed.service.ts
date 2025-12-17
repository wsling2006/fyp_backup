import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activitylog.entity';
import { Employee } from './employee.entity';
import sampleData from './activitylog.sample.json';

@Injectable()
export class ActivityLogSeedService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.activityLogRepository.clear();
    // Fetch all employees and build a mapping from sample index (1-based) to employee entity
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[idx + 1] = emp;
    });
    const mapped = (sampleData as any[]).map(row => ({
      user_email: employeeMap[row.employeeId]?.email || null,
      action: row.action,
      details: row.description,
      timestamp: new Date(row.timestamp),
    }));
    await this.activityLogRepository.save(mapped);
  }
}
