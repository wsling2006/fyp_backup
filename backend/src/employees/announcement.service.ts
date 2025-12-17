import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  findAll() {
    return this.announcementRepository.find();
  }

  findOne(id: string) {
    return this.announcementRepository.findOne({ where: { id } });
  }

  create(data: Partial<Announcement>) {
    return this.announcementRepository.save(data);
  }

  update(id: string, data: Partial<Announcement>) {
    return this.announcementRepository.update(id, data);
  }

  remove(id: string) {
    return this.announcementRepository.delete(id);
  }
}
