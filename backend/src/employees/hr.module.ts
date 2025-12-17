import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Announcement } from './announcement.entity';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { Document } from './document.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { ActivityLog } from './activitylog.entity';
import { ActivityLogService } from './activitylog.service';
import { ActivityLogController } from './activitylog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      Announcement,
      Document,
      ActivityLog,
    ]),
  ],
  providers: [
    AttendanceService,
    AnnouncementService,
    DocumentService,
    ActivityLogService,
  ],
  controllers: [
    AttendanceController,
    AnnouncementController,
    DocumentController,
    ActivityLogController,
  ],
})
export class HRModule {}
