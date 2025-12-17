import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity';
import { Attendance } from './attendance.entity';
import { Announcement } from './announcement.entity';
import { Document } from './document.entity';
import { ActivityLog } from './activitylog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Attendance,
      Announcement,
      Document,
      ActivityLog,
    ]),
  ],
  providers: [],
  exports: [],
})
export class EmployeesModule {}
