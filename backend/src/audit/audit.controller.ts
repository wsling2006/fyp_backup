import { Controller, Get, Query, UseGuards, Req, Delete, Param, Post, Body, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * Get all audit logs
   * Only accessible by SUPER_ADMIN
   */
  @Get()
  @Roles(Role.SUPER_ADMIN)
  async getAuditLogs(
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};

    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    return this.auditService.findAll(filters);
  }

  /**
   * Get user's own activity
   * Accessible by authenticated users (can see their own logs)
   */
  @Get('my-activity')
  async getMyActivity(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const logs = await this.auditService.getUserActivity(userId, limitNum);
    return { logs, total: logs.length };
  }

  /**
   * Get audit logs for a specific resource
   * Only accessible by SUPER_ADMIN
   */
  @Get('resource')
  @Roles(Role.SUPER_ADMIN)
  async getResourceAudit(
    @Query('resource') resource: string,
    @Query('resource_id') resourceId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!resource) {
      return { message: 'Resource parameter is required', logs: [] };
    }

    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.auditService.getResourceAudit(resource, resourceId, limitNum);
    return { logs, total: logs.length };
  }

  /**
   * Delete a specific audit log by ID
   * Only accessible by SUPER_ADMIN
   * Note: Individual deletions are NOT logged to avoid database bloat
   * Only bulk "clear all" operations are logged
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async deleteAuditLog(@Param('id') id: string, @Req() req: any) {
    // Don't log individual deletions to prevent database bloat
    // Only "clear all" operation is logged as it's a critical action
    await this.auditService.deleteLog(id);
    return { message: 'Audit log deleted successfully', id };
  }

  /**
   * Request OTP to clear all audit logs
   * Step 1: Verify password and send OTP to email
   */
  @Post('clear-all/request-otp')
  @Roles(Role.SUPER_ADMIN)
  async requestClearAllOtp(@Body() body: { password: string }, @Req() req: any) {
    const { password } = body;
    
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const userId = req.user.userId;
    const result = await this.auditService.requestClearAllOtp(userId, password);
    
    return result;
  }

  /**
   * Clear all audit logs
   * Step 2: Verify OTP and clear all logs
   * DANGEROUS OPERATION - Cannot be undone!
   */
  @Post('clear-all/verify')
  @Roles(Role.SUPER_ADMIN)
  async clearAllAuditLogs(@Body() body: { otp: string }, @Req() req: any) {
    const { otp } = body;
    
    if (!otp) {
      throw new BadRequestException('OTP is required');
    }

    const userId = req.user.userId;
    
    // Verify OTP and get count before deletion
    const result = await this.auditService.clearAllLogs(userId, otp);
    
    // Log this critical action (this will be the first entry after clearing)
    await this.auditService.logFromRequest(
      req,
      userId,
      'CLEAR_ALL_AUDIT_LOGS',
      'audit',
      undefined,
      { 
        logs_deleted: result.deletedCount,
        warning: 'All audit logs were cleared - this action cannot be undone',
      },
    );

    return result;
  }
}
