import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { Employee } from './employee.entity';
import sampleData from './announcement.sample.json';

@Injectable()
export class AnnouncementSeedService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.announcementRepository.clear();
    // Fetch all employees and build a mapping from sample index (1-based) to employee entity
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[idx + 1] = emp;
    });
    const mapped = (sampleData as any[]).map(row => ({
      title: row.title,
      content: row.message,
      created_by: employeeMap[row.createdBy]?.id || null,
      created_at: new Date(row.date),
    }));
    await this.announcementRepository.save(mapped);
  }
}
