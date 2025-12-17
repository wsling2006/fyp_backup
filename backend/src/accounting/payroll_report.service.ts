import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollReport } from './payroll_report.entity';

@Injectable()
export class PayrollReportService {
  constructor(
    @InjectRepository(PayrollReport)
    private readonly repo: Repository<PayrollReport>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<PayrollReport>) {
    return this.repo.save(data);
  }

  update(id: string, data: Partial<PayrollReport>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
