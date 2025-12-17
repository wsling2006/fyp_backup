import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashFlow } from './cash_flow.entity';

@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(CashFlow)
    private readonly repo: Repository<CashFlow>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<CashFlow>) {
    return this.repo.save(data);
  }

  update(id: string, data: Partial<CashFlow>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
