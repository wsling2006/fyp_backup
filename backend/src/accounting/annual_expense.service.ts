import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualExpense } from './annual_expense.entity';

@Injectable()
export class AnnualExpenseService {
  constructor(
    @InjectRepository(AnnualExpense)
    private readonly repo: Repository<AnnualExpense>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<AnnualExpense>) {
    return this.repo.save(data);
  }

  update(id: string, data: Partial<AnnualExpense>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
