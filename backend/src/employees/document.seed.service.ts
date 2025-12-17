import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { Employee } from './employee.entity';
import sampleData from './document.sample.json';

@Injectable()
export class DocumentSeedService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async seed() {
    await this.documentRepository.clear();
    // Fetch all employees and build a mapping from sample index (1-based) to employee entity
    const employees = await this.employeeRepository.find({ order: { name: 'ASC' } });
    const employeeMap = {};
    employees.forEach((emp, idx) => {
      employeeMap[idx + 1] = emp;
    });
    const mapped = (sampleData as any[]).map(row => ({
      title: row.name,
      description: row.type,
      file_url: row.url,
      uploaded_by: employeeMap[row.employeeId]?.id || null,
      doc_type: row.type,
      uploaded_at: new Date(row.uploadedAt),
    }));
    await this.documentRepository.save(mapped);
  }
}
