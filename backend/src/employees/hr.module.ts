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
// NEW: HR Employee Management
import { Employee } from './employee.entity';
import { EmployeeDocument } from './employee-document.entity';
import { HRService } from './hr.service';
import { HRController } from './hr.controller';
import { ClamavModule } from '../clamav/clamav.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module'; // For password verification

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      Announcement,
      Document,
      ActivityLog,
      Employee, // Add Employee entity
      EmployeeDocument, // Add EmployeeDocument entity
    ]),
    ClamavModule, // Import ClamAV for file scanning
    AuditModule, // Import Audit for logging
    UsersModule, // Import Users for password verification in delete operation
  ],
  providers: [
    AttendanceService,
    AnnouncementService,
    DocumentService,
    ActivityLogService,
    HRService, // Add HR service
  ],
  controllers: [
    AttendanceController,
    AnnouncementController,
    DocumentController,
    ActivityLogController,
    HRController, // Add HR controller
  ],
  exports: [HRService], // Export for potential use in other modules
})
export class HRModule {}
