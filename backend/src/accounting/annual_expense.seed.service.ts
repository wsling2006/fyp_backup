import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualExpense } from './annual_expense.entity';
import sampleData from './annual_expense.sample.json';

@Injectable()
export class AnnualExpenseSeedService {
  constructor(
    @InjectRepository(AnnualExpense)
    private readonly repo: Repository<AnnualExpense>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Filter out any invalid rows (missing year, category, amount, notes)
    const validData = (sampleData as any[]).filter(row =>
      row && row.year && row.category && row.amount !== undefined && row.notes
    );
    await this.repo.save(validData);
  }
}
