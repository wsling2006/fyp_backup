import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyRevenue } from './company_revenue.entity';

@Injectable()
export class CompanyRevenueService {
  constructor(
    @InjectRepository(CompanyRevenue)
    private readonly repo: Repository<CompanyRevenue>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<CompanyRevenue>) {
    return this.repo.save(data);
  }

  update(id: string, data: Partial<CompanyRevenue>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
