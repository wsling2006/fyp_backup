import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  findAll() {
    return this.documentRepository.find();
  }

  findOne(id: string) {
    return this.documentRepository.findOne({ where: { id } });
  }

  create(data: Partial<Document>) {
    return this.documentRepository.save(data);
  }

  update(id: string, data: Partial<Document>) {
    return this.documentRepository.update(id, data);
  }

  remove(id: string) {
    return this.documentRepository.delete(id);
  }
}
