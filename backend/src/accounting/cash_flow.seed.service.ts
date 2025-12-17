import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashFlow } from './cash_flow.entity';
import sampleData from './cash_flow.sample.json';

@Injectable()
export class CashFlowSeedService {
  constructor(
    @InjectRepository(CashFlow)
    private readonly repo: Repository<CashFlow>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Filter out any invalid rows (missing month, year, cash_in, cash_out, net_cash, notes)
    const validData = (sampleData as any[]).filter(row =>
      row && row.month && row.year && row.cash_in !== undefined && row.cash_out !== undefined && row.net_cash !== undefined && row.notes
    );
    await this.repo.save(validData);
  }
}
