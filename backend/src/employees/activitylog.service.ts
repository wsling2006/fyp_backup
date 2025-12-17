import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activitylog.entity';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  findAll() {
    return this.activityLogRepository.find();
  }

  findOne(id: string) {
    return this.activityLogRepository.findOne({ where: { id } });
  }

  create(data: Partial<ActivityLog>) {
    return this.activityLogRepository.save(data);
  }

  update(id: string, data: Partial<ActivityLog>) {
    return this.activityLogRepository.update(id, data);
  }

  remove(id: string) {
    return this.activityLogRepository.delete(id);
  }
}
