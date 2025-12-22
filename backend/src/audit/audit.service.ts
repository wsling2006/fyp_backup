import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditService {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  /**
   * Log an action to the audit trail
   */
  async log(params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<AuditLog> {
    const log = this.auditRepo.create({
      user_id: params.userId,
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      metadata: params.metadata || null,
    });

    return this.auditRepo.save(log);
  }

  /**
   * Log from Express request
   */
  async logFromRequest(
    req: Request,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
  ): Promise<AuditLog> {
    // Extract real client IP (handles proxies, Nginx, etc.)
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.log({
      userId,
      action,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Get real client IP address from request
   * Handles X-Forwarded-For, X-Real-IP headers set by proxies (Nginx, load balancers)
   */
  private getClientIp(req: Request): string {
    // Priority order for IP detection:
    // 1. X-Real-IP (set by Nginx)
    // 2. X-Forwarded-For (first IP in the chain)
    // 3. req.ip (Express)
    // 4. req.connection.remoteAddress
    // 5. Fallback to 'unknown'

    let ip: string | undefined;

    const xRealIp = req.headers['x-real-ip'] as string;
    if (xRealIp) {
      ip = xRealIp;
    } else {
      const xForwardedFor = req.headers['x-forwarded-for'] as string;
      if (xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // The first one is the real client IP
        ip = xForwardedFor.split(',')[0].trim();
      } else if (req.ip) {
        ip = req.ip;
      } else if (req.connection?.remoteAddress) {
        ip = req.connection.remoteAddress;
      }
    }

    if (!ip) {
      return 'unknown';
    }

    // Clean up IPv4-mapped IPv6 addresses
    // ::ffff:192.168.1.1 → 192.168.1.1
    return this.cleanIpAddress(ip);
  }

  /**
   * Clean IP address format
   * Removes IPv6 prefix and normalizes the IP
   */
  private cleanIpAddress(ip: string): string {
    // Remove IPv4-mapped IPv6 prefix (::ffff:192.168.1.1 → 192.168.1.1)
    let cleaned = ip.replace(/^::ffff:/i, '');
    
    // Remove surrounding brackets if present [2001:db8::1] → 2001:db8::1
    cleaned = cleaned.replace(/^\[|\]$/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned || 'unknown';
  }

  /**
   * Get all audit logs (for super admin)
   */
  async findAll(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditRepo.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.created_at', 'DESC');

    if (filters?.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filters.userId });
    }

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.resource) {
      query.andWhere('audit.resource = :resource', { resource: filters.resource });
    }

    if (filters?.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    if (filters?.offset) {
      query.offset(filters.offset);
    }

    const logs = await query.getMany();

    return { logs, total };
  }

  /**
   * Get recent activity for a specific user
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAudit(resource: string, resourceId?: string, limit: number = 100): Promise<AuditLog[]> {
    const where: any = { resource };
    if (resourceId) {
      where.resource_id = resourceId;
    }

    return this.auditRepo.find({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Delete a specific audit log by ID
   * Use with extreme caution - audit logs should rarely be deleted
   */
  async deleteLog(id: string): Promise<void> {
    const log = await this.auditRepo.findOne({ where: { id } });
    
    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    await this.auditRepo.remove(log);
  }

  /**
   * Request OTP to clear all audit logs
   * Step 1: Verify password and send OTP
   */
  async requestClearAllOtp(userId: string, password: string): Promise<{ message: string }> {
    // Verify user and password
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password_hash, password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in memory (for this critical operation, we use in-memory store)
    this.otpStore.set(userId, { otp, expiresAt });

    // Send OTP email
    await this.sendClearAllOtpEmail(user.email, otp);

    return {
      message: 'OTP sent to your email. Valid for 10 minutes.',
    };
  }

  /**
   * Clear all audit logs after OTP verification
   * DANGEROUS OPERATION - Cannot be undone!
   */
  async clearAllLogs(userId: string, otp: string): Promise<{ message: string; deletedCount: number }> {
    // Verify OTP
    const storedOtp = this.otpStore.get(userId);

    if (!storedOtp) {
      throw new BadRequestException('No OTP request found. Please request OTP first.');
    }

    if (storedOtp.expiresAt < new Date()) {
      this.otpStore.delete(userId);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (storedOtp.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // OTP is valid, clear it from store
    this.otpStore.delete(userId);

    // Count logs before deletion
    const count = await this.auditRepo.count();

    // Delete all audit logs
    await this.auditRepo.clear();

    return {
      message: `All audit logs cleared successfully. ${count} logs were deleted.`,
      deletedCount: count,
    };
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP email for clearing all logs
   */
  private async sendClearAllOtpEmail(email: string, otp: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: '⚠️ CRITICAL: Clear All Audit Logs - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 3px solid #dc2626; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">⚠️ CRITICAL ACTION</h1>
            <h2 style="color: #333; margin: 10px 0 0 0;">Clear All Audit Logs</h2>
          </div>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">
              ⚠️ WARNING: This action cannot be undone!
            </p>
            <p style="margin: 10px 0 0 0; color: #dc2626;">
              All audit logs will be permanently deleted from the system.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
              A request has been made to clear all audit logs. If this was not you, change your password immediately.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #dc2626; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                ${otp}
              </div>
            </div>

            <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
              This OTP is valid for <strong>10 minutes</strong>
            </p>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              <strong>Before proceeding, make sure:</strong><br>
              ✓ You have exported/backed up any necessary audit logs<br>
              ✓ You understand this action is irreversible<br>
              ✓ You have proper authorization to perform this action
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              FYP System - Audit Log Management<br>
              This is an automated security notification
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }
}
