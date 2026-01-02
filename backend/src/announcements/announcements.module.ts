import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAcknowledgment } from './entities/announcement-acknowledgment.entity';
import { AnnouncementReaction } from './entities/announcement-reaction.entity';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { AnnouncementAttachment } from './entities/announcement-attachment.entity';
import { ClamavModule } from '../clamav/clamav.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementAcknowledgment,
      AnnouncementReaction,
      AnnouncementComment,
      AnnouncementAttachment,
    ]),
    ClamavModule,
    AuditModule,
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
