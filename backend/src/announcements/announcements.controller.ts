import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
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
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { AnnouncementsService } from './announcements.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
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
      req.user.userId, // Fixed: use userId not id
      req,
    );
  }

  // HR: Delete announcement
  @Delete(':id')
  @Roles(Role.HR)
  async deleteAnnouncement(
    @Param('id') announcementId: string,
    @Req() req: any,
  ) {
    await this.announcementsService.deleteAnnouncement(
      announcementId,
      req.user.userId,
      req,
    );
    return {
      success: true,
      message: 'Announcement deleted successfully',
    };
  }

  // HR: Update announcement
  @Put(':id')
  @Roles(Role.HR)
  async updateAnnouncement(
    @Param('id') announcementId: string,
    @Body() updateDto: UpdateAnnouncementDto,
    @Req() req: any,
  ) {
    const updated = await this.announcementsService.updateAnnouncement(
      announcementId,
      updateDto,
      req.user.userId,
      req,
    );
    return {
      success: true,
      message: 'Announcement updated successfully',
      announcement: updated,
    };
  }

  // HR: Upload attachment to announcement
  @Post(':id/attachments')
  @Roles(Role.HR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') announcementId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.announcementsService.uploadAttachment(
      announcementId,
      file,
      req.user.userId, // Fixed: use userId not id
      req,
    );
  }

  // ALL: Get all announcements
  @Get()
  async getAllAnnouncements(@Req() req: any) {
    return this.announcementsService.getAllAnnouncements(req.user.userId);
  }

  // ALL: Get unacknowledged urgent announcements
  @Get('urgent/unacknowledged')
  async getUnacknowledgedUrgent(@Req() req: any) {
    return this.announcementsService.getUnacknowledgedUrgent(req.user.userId);
  }

  // ALL: Acknowledge announcement
  @Post(':id/acknowledge')
  async acknowledgeAnnouncement(@Param('id') announcementId: string, @Req() req: any) {
    await this.announcementsService.acknowledgeAnnouncement(
      announcementId,
      req.user.userId,
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
      req.user.userId,
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
      req.user.userId,
      req,
    );
  }

  // ALL: Get comments
  @Get(':id/comments')
  async getComments(@Param('id') announcementId: string) {
    return this.announcementsService.getComments(announcementId);
  }

  // ALL: Update own comment
  @Put('comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateDto: { content: string },
    @Req() req: any,
  ) {
    return this.announcementsService.updateComment(
      commentId,
      updateDto.content,
      req.user.userId,
      req,
    );
  }

  // ALL: Delete own comment
  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    await this.announcementsService.deleteComment(
      commentId,
      req.user.userId,
      req,
    );
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
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
        req.user.userId,
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
