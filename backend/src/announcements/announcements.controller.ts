import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { AnnouncementsService } from './announcements.service';
import {
  CreateAnnouncementDto,
  AddCommentDto,
  AddReactionDto,
} from './dto/create-announcement.dto';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // HR: Create announcement
  @Post()
  @Roles(Role.HR)
  async createAnnouncement(
    @Body() createDto: CreateAnnouncementDto,
    @Req() req: any,
  ) {
    return this.announcementsService.createAnnouncement(
      createDto,
      req.user.id,
      req,
    );
  }

  // HR: Upload attachment to announcement
  @Post(':id/attachments')
  @Roles(Role.HR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') announcementId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.announcementsService.uploadAttachment(
      announcementId,
      file,
      req.user.id,
      req,
    );
  }

  // ALL: Get all announcements
  @Get()
  async getAllAnnouncements(@Req() req: any) {
    return this.announcementsService.getAllAnnouncements(req.user.id);
  }

  // ALL: Get unacknowledged urgent announcements
  @Get('urgent/unacknowledged')
  async getUnacknowledgedUrgent(@Req() req: any) {
    return this.announcementsService.getUnacknowledgedUrgent(req.user.id);
  }

  // ALL: Acknowledge announcement
  @Post(':id/acknowledge')
  async acknowledgeAnnouncement(@Param('id') announcementId: string, @Req() req: any) {
    await this.announcementsService.acknowledgeAnnouncement(
      announcementId,
      req.user.id,
      req,
    );
    return { message: 'Announcement acknowledged' };
  }

  // ALL: Add reaction
  @Post(':id/reactions')
  async addReaction(
    @Param('id') announcementId: string,
    @Body() reactionDto: AddReactionDto,
    @Req() req: any,
  ) {
    await this.announcementsService.addReaction(
      announcementId,
      reactionDto,
      req.user.id,
      req,
    );
    return { message: 'Reaction added' };
  }

  // ALL: Add comment
  @Post(':id/comments')
  async addComment(
    @Param('id') announcementId: string,
    @Body() commentDto: AddCommentDto,
    @Req() req: any,
  ) {
    return this.announcementsService.addComment(
      announcementId,
      commentDto,
      req.user.id,
      req,
    );
  }

  // ALL: Get comments
  @Get(':id/comments')
  async getComments(@Param('id') announcementId: string) {
    return this.announcementsService.getComments(announcementId);
  }

  // ALL: Download attachment (secure streaming)
  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimetype } =
      await this.announcementsService.downloadAttachment(
        attachmentId,
        req.user.id,
        req,
      );

    // SECURITY: Force download, never inline render
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    res.send(buffer);
  }
}
