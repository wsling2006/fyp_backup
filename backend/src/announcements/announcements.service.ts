import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAcknowledgment } from './entities/announcement-acknowledgment.entity';
import { AnnouncementReaction, ReactionType } from './entities/announcement-reaction.entity';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { AnnouncementAttachment } from './entities/announcement-attachment.entity';
import { CreateAnnouncementDto, AddCommentDto, AddReactionDto } from './dto/create-announcement.dto';
import { ClamavService } from '../clamav/clamav.service';
import { AuditService } from '../audit/audit.service';
import { AnnouncementPriority } from './enums/announcement-priority.enum';

// SECURITY: MIME type whitelist for allowed file types
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
];

// SECURITY: Explicitly block executable file extensions
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1',
  '.js', '.vbs', '.jar', '.apk', '.msi',
  '.dll', '.so', '.dylib', '.app', '.com',
  '.scr', '.pif', '.gadget', '.wsf',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementAcknowledgment)
    private acknowledgmentRepo: Repository<AnnouncementAcknowledgment>,
    @InjectRepository(AnnouncementReaction)
    private reactionRepo: Repository<AnnouncementReaction>,
    @InjectRepository(AnnouncementComment)
    private commentRepo: Repository<AnnouncementComment>,
    @InjectRepository(AnnouncementAttachment)
    private attachmentRepo: Repository<AnnouncementAttachment>,
    private clamavService: ClamavService,
    private auditService: AuditService,
  ) {}

  // Create announcement (HR only)
  async createAnnouncement(
    createDto: CreateAnnouncementDto,
    userId: string,
    req: any,
  ): Promise<Announcement> {
    const announcement = this.announcementRepo.create({
      title: createDto.title,
      content: createDto.content,
      priority: createDto.priority,
      created_by: userId,
    });

    const saved = await this.announcementRepo.save(announcement);

    await this.auditService.logFromRequest(
      req,
      userId,
      'HR_CREATE_ANNOUNCEMENT',
      `Created announcement: ${saved.title} (${saved.priority})`,
    );

    return saved;
  }

  // Upload attachment with SECURITY CONTROLS
  async uploadAttachment(
    announcementId: string,
    file: any,
    userId: string,
    req: any,
  ): Promise<AnnouncementAttachment> {
    // Validate announcement exists
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId, is_deleted: false },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // SECURITY CHECK 1: File size validation
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // SECURITY CHECK 2: MIME type whitelist validation
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: documents, images, archives. Received: ${file.mimetype}`,
      );
    }

    // SECURITY CHECK 3: Executable extension blocking
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const fullExtension = `.${fileExtension}`;
    if (BLOCKED_EXTENSIONS.includes(fullExtension)) {
      throw new BadRequestException(
        `Executable files are not allowed for security reasons. Blocked extension: ${fullExtension}`,
      );
    }

    // SECURITY CHECK 4: ClamAV malware scanning
    const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
    if (!isClean) {
      await this.auditService.logFromRequest(
        req,
        userId,
        'MALWARE_DETECTED_ANNOUNCEMENT',
        `Malware detected in file: ${file.originalname}`,
      );
      throw new BadRequestException('Malware detected in uploaded file');
    }

    // SECURITY CHECK 5: SHA-256 hashing for duplicate detection
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Check for duplicate
    const existingFile = await this.attachmentRepo.findOne({
      where: { file_hash: fileHash, is_deleted: false },
    });
    if (existingFile) {
      throw new BadRequestException('This file has already been uploaded');
    }

    // Store file in database (BYTEA storage)
    const attachment = this.attachmentRepo.create({
      announcement_id: announcementId,
      original_filename: file.originalname,
      stored_filename: `${Date.now()}_${file.originalname}`,
      mime_type: file.mimetype,
      file_size: file.size,
      file_hash: fileHash,
      file_data: file.buffer,
      uploaded_by: userId,
    });

    const saved = await this.attachmentRepo.save(attachment);

    await this.auditService.logFromRequest(
      req,
      userId,
      'HR_UPLOAD_ANNOUNCEMENT_ATTACHMENT',
      `Uploaded attachment: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
    );

    return saved;
  }

  // Get all announcements (with user acknowledgment status)
  async getAllAnnouncements(userId: string): Promise<any[]> {
    const announcements = await this.announcementRepo.find({
      where: { is_deleted: false },
      relations: ['author', 'attachments', 'reactions', 'comments'],
      order: { created_at: 'DESC' },
    });

    // Enrich with user's acknowledgment status
    const enriched = await Promise.all(
      announcements.map(async (announcement) => {
        const ack = await this.acknowledgmentRepo.findOne({
          where: { announcement_id: announcement.id, user_id: userId },
        });

        const reactionCounts = await this.getReactionCounts(announcement.id);
        const userReaction = await this.reactionRepo.findOne({
          where: { announcement_id: announcement.id, user_id: userId },
        });

        return {
          ...announcement,
          file_data: undefined, // Don't send file data in list
          is_acknowledged: !!ack,
          acknowledged_at: ack?.acknowledged_at || null,
          reaction_counts: reactionCounts,
          user_reaction: userReaction?.reaction_type || null,
          comment_count: announcement.comments?.filter((c) => !c.is_deleted).length || 0,
        };
      }),
    );

    return enriched;
  }

  // Get unacknowledged urgent announcements (for blocking modal)
  async getUnacknowledgedUrgent(userId: string): Promise<Announcement[]> {
    const urgentAnnouncements = await this.announcementRepo.find({
      where: { priority: AnnouncementPriority.URGENT, is_deleted: false },
      relations: ['author'],
      order: { created_at: 'DESC' },
    });

    const unacknowledged: Announcement[] = [];
    for (const announcement of urgentAnnouncements) {
      const ack = await this.acknowledgmentRepo.findOne({
        where: { announcement_id: announcement.id, user_id: userId },
      });
      if (!ack) {
        unacknowledged.push(announcement);
      }
    }

    return unacknowledged;
  }

  // Acknowledge announcement
  async acknowledgeAnnouncement(
    announcementId: string,
    userId: string,
    req: any,
  ): Promise<void> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId, is_deleted: false },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Upsert acknowledgment
    const existing = await this.acknowledgmentRepo.findOne({
      where: { announcement_id: announcementId, user_id: userId },
    });

    if (!existing) {
      await this.acknowledgmentRepo.save({
        announcement_id: announcementId,
        user_id: userId,
        acknowledged: true,
      });

      await this.auditService.logFromRequest(
        req,
        userId,
        'USER_ACK_ANNOUNCEMENT',
        `Acknowledged announcement: ${announcement.title}`,
      );
    }
  }

  // Add reaction (upsert)
  async addReaction(
    announcementId: string,
    reactionDto: AddReactionDto,
    userId: string,
    req: any,
  ): Promise<void> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId, is_deleted: false },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Delete existing reaction
    await this.reactionRepo.delete({
      announcement_id: announcementId,
      user_id: userId,
    });

    // Add new reaction
    await this.reactionRepo.save({
      announcement_id: announcementId,
      user_id: userId,
      reaction_type: reactionDto.reaction_type as ReactionType,
    });

    await this.auditService.logFromRequest(
      req,
      userId,
      'USER_REACT_ANNOUNCEMENT',
      `Reacted ${reactionDto.reaction_type} to: ${announcement.title}`,
    );
  }

  // Add comment
  async addComment(
    announcementId: string,
    commentDto: AddCommentDto,
    userId: string,
    req: any,
  ): Promise<AnnouncementComment> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId, is_deleted: false },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const comment = this.commentRepo.create({
      announcement_id: announcementId,
      user_id: userId,
      content: commentDto.content,
    });

    const saved = await this.commentRepo.save(comment);

    await this.auditService.logFromRequest(
      req,
      userId,
      'USER_COMMENT_ANNOUNCEMENT',
      `Commented on: ${announcement.title}`,
    );

    return saved;
  }

  // Get comments for announcement
  async getComments(announcementId: string): Promise<any[]> {
    const comments = await this.commentRepo.find({
      where: { announcement_id: announcementId, is_deleted: false },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });

    return comments.map((c) => ({
      ...c,
      user_email: c.user?.email || 'Unknown',
    }));
  }

  // Download attachment (secure streaming)
  async downloadAttachment(
    attachmentId: string,
    userId: string,
    req: any,
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, is_deleted: false },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.auditService.logFromRequest(
      req,
      userId,
      'USER_DOWNLOAD_ANNOUNCEMENT_ATTACHMENT',
      `Downloaded: ${attachment.original_filename}`,
    );

    return {
      buffer: attachment.file_data,
      filename: attachment.original_filename,
      mimetype: attachment.mime_type,
    };
  }

  // Helper: Get reaction counts
  private async getReactionCounts(announcementId: string): Promise<Record<string, number>> {
    const reactions = await this.reactionRepo.find({
      where: { announcement_id: announcementId },
    });

    const counts: Record<string, number> = {
      '👍': 0,
      '❤️': 0,
      '😮': 0,
      '😢': 0,
      '❗': 0,
    };

    reactions.forEach((r) => {
      counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    });

    return counts;
  }
}
