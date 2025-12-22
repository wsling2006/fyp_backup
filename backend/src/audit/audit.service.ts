import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { Request } from 'express';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
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
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.connection.remoteAddress;
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
}
