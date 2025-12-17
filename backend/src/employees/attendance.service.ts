import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  findAll() {
    return this.attendanceRepository.find({ relations: ['employee'] });
  }

  findOne(id: string) {
    return this.attendanceRepository.findOne({ where: { id }, relations: ['employee'] });
  }

  create(data: Partial<Attendance>) {
    return this.attendanceRepository.save(data);
  }

  update(id: string, data: Partial<Attendance>) {
    return this.attendanceRepository.update(id, data);
  }

  remove(id: string) {
    return this.attendanceRepository.delete(id);
  }
}
