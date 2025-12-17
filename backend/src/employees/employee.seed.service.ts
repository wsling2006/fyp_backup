import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import sampleData from './employee.sample.json';

@Injectable()
export class EmployeeSeedService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  async seedEmployees() {
    for (const data of sampleData) {
      // Check if employee already exists by email
      const exists = await this.employeeRepo.findOne({ where: { email: data.email } });
      if (!exists) {
        await this.employeeRepo.save({
          ...data,
          date_of_joining: new Date(data.date_of_joining),
        });
      }
    }
    return { message: 'Employee sample data seeded.' };
  }
}
