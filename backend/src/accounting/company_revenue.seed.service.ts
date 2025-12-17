import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyRevenue } from './company_revenue.entity';
import sampleData from './company_revenue.sample.json';

@Injectable()
export class CompanyRevenueSeedService {
  constructor(
    @InjectRepository(CompanyRevenue)
    private readonly repo: Repository<CompanyRevenue>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Filter out any invalid rows (missing year, quarter, revenue, or notes)
    const validData = (sampleData as any[]).filter(row =>
      row && row.year && row.quarter && row.revenue && row.notes
    );
    await this.repo.save(validData);
  }
}
