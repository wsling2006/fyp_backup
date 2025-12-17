import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './supplier.entity';
import sampleData from './supplier.sample.json';

@Injectable()
export class SupplierSeedService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  async seed() {
    await this.repo.clear();
    // Filter out any invalid rows (missing supplier_name, category, phone, email, document_path, uploaded_at)
    const validData = (sampleData as any[]).filter(row =>
      row && row.supplier_name && row.category && row.phone && row.email && row.document_path && row.uploaded_at
    );
    await this.repo.save(validData);
  }
}
