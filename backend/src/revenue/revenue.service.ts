import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Revenue } from './revenue.entity';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';

/**
 * Revenue Service
 * 
 * Business logic for revenue management.
 * Handles CRUD operations with user tracking and filtering.
 * 
 * For FYP: Demonstrates separation of concerns, repository pattern,
 * and secure data access with user attribution.
 */
@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(Revenue)
    private readonly revenueRepository: Repository<Revenue>,
  ) {}

  /**
   * Create a new revenue record
   * 
   * @param dto - Revenue data
   * @param userId - ID of user creating the record (from JWT)
   * @returns Created revenue record
   */
  async create(dto: CreateRevenueDto, userId: string): Promise<Revenue> {
    // Log action for audit trail (console since no AuditService exists)
    console.log('[AUDIT] CREATE_REVENUE', {
      userId,
      timestamp: new Date().toISOString(),
      data: { client: dto.client, amount: dto.amount, source: dto.source },
    });

    const revenue = this.revenueRepository.create({
      ...dto,
      created_by_user_id: userId,
    });

    return this.revenueRepository.save(revenue);
  }

  /**
   * Find all revenue records with optional filtering
   * 
   * Supports filters:
   * - Date range
   * - Client
   * - Status
   * - Source
   * 
   * @param query - Filter parameters
   * @param userId - User requesting data (for audit)
   * @returns Array of revenue records with creator info
   */
  async findAll(query: QueryRevenueDto, userId: string): Promise<Revenue[]> {
    // Log view action for audit trail
    console.log('[AUDIT] VIEW_REVENUE', {
      userId,
      timestamp: new Date().toISOString(),
      filters: query,
    });

    const where: any = {};

    // Date range filter
    if (query.start_date && query.end_date) {
      where.date = Between(new Date(query.start_date), new Date(query.end_date));
    } else if (query.start_date) {
      where.date = MoreThanOrEqual(new Date(query.start_date));
    } else if (query.end_date) {
      where.date = LessThanOrEqual(new Date(query.end_date));
    }

    // Client filter
    if (query.client) {
      where.client = query.client;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Source filter
    if (query.source) {
      where.source = query.source;
    }

    const revenues = await this.revenueRepository.find({
      where,
      relations: ['created_by'],
      order: {
        date: 'DESC',
        created_at: 'DESC',
      },
    });

    // Log record count
    console.log(`[AUDIT] VIEW_REVENUE returned ${revenues.length} records`);

    return revenues;
  }

  /**
   * Get revenue analytics summary
   * 
   * Returns:
   * - Total revenue
   * - Paid revenue
   * - Pending revenue
   * - Record count
   * 
   * @param query - Filter parameters
   * @param userId - User requesting data (for audit)
   * @returns Summary statistics
   */
  async getSummary(query: QueryRevenueDto, userId: string) {
    console.log('[AUDIT] VIEW_REVENUE_SUMMARY', {
      userId,
      timestamp: new Date().toISOString(),
      filters: query,
    });

    const revenues = await this.findAll(query, userId);

    const summary = {
      total_revenue: 0,
      paid_revenue: 0,
      pending_revenue: 0,
      total_count: revenues.length,
      paid_count: 0,
      pending_count: 0,
    };

    revenues.forEach((r) => {
      summary.total_revenue += Number(r.amount);
      if (r.status === 'PAID') {
        summary.paid_revenue += Number(r.amount);
        summary.paid_count++;
      } else {
        summary.pending_revenue += Number(r.amount);
        summary.pending_count++;
      }
    });

    return summary;
  }

  /**
   * Get a single revenue record by ID
   * 
   * @param id - Revenue record UUID
   * @param userId - User requesting data (for audit)
   * @returns Revenue record
   * @throws NotFoundException if not found
   */
  async findOne(id: string, userId: string): Promise<Revenue> {
    console.log('[AUDIT] VIEW_REVENUE_DETAIL', {
      userId,
      revenueId: id,
      timestamp: new Date().toISOString(),
    });

    const revenue = await this.revenueRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!revenue) {
      throw new NotFoundException(`Revenue record with ID ${id} not found`);
    }

    return revenue;
  }
}
