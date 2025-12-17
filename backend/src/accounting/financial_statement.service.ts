import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialStatement } from './financial_statement.entity';

@Injectable()
export class FinancialStatementService {
  constructor(
    @InjectRepository(FinancialStatement)
    private readonly repo: Repository<FinancialStatement>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<FinancialStatement>) {
    return this.repo.save(data);
  }

  update(id: string, data: Partial<FinancialStatement>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
