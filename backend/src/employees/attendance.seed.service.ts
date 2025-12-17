import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { Employee } from './employee.entity';
import sampleData from './attendance.sample.json';

@Injectable()
export class AttendanceSeedService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.attendanceRepository.clear();
    // Fetch all employees and build a mapping from sample index (1-based) to employee entity
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    // If employee.sample.json order matches DB insert order, map by index
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[idx + 1] = emp; // sampleData employeeId is 1-based
    });
    const mapped = (sampleData as any[]).map(row => ({
      employee: employeeMap[row.employeeId],
      date: new Date(row.date),
      status: row.status,
    }));
    await this.attendanceRepository.save(mapped);
  }
}
