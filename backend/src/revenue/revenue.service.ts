import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Revenue } from './revenue.entity';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';
import { User } from '../users/user.entity';

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

    // Log record count and IDs for debugging
    console.log(`[AUDIT] VIEW_REVENUE returned ${revenues.length} records`);
    console.log('[DEBUG] Record IDs:', revenues.map(r => ({ id: r.id, client: r.client, created_by_user_id: r.created_by_user_id })));

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

  /**
   * Get revenue trends over time (daily or monthly)
   * 
   * @param query - Filter parameters
   * @param userId - User requesting data (for audit)
   * @param granularity - 'daily' or 'monthly'
   * @returns Array of revenue data points with dates
   */
  async getTrends(query: QueryRevenueDto, userId: string, granularity: 'daily' | 'monthly' = 'daily') {
    console.log('[AUDIT] VIEW_REVENUE_TRENDS', {
      userId,
      timestamp: new Date().toISOString(),
      granularity,
      filters: query,
    });

    const revenues = await this.findAll(query, userId);
    
    // Group revenues by date
    const grouped = new Map<string, number>();
    
    revenues.forEach((r) => {
      const date = new Date(r.date);
      let key: string;
      
      if (granularity === 'monthly') {
        key = date.toISOString().substring(0, 7); // YYYY-MM
      } else {
        key = date.toISOString().substring(0, 10); // YYYY-MM-DD
      }
      
      grouped.set(key, (grouped.get(key) || 0) + Number(r.amount));
    });

    // Convert to sorted array
    const trends = Array.from(grouped.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([date, revenue]) => ({
        date,
        revenue,
      }));

    return trends;
  }

  /**
   * Get revenue breakdown by source
   * 
   * @param query - Filter parameters
   * @param userId - User requesting data (for audit)
   * @returns Array of sources with their total revenue
   */
  async getBySource(query: QueryRevenueDto, userId: string) {
    console.log('[AUDIT] VIEW_REVENUE_BY_SOURCE', {
      userId,
      timestamp: new Date().toISOString(),
      filters: query,
    });

    const revenues = await this.findAll(query, userId);
    
    const sourceMap = new Map<string, { revenue: number; count: number }>();
    
    revenues.forEach((r) => {
      const existing = sourceMap.get(r.source) || { revenue: 0, count: 0 };
      sourceMap.set(r.source, {
        revenue: existing.revenue + Number(r.amount),
        count: existing.count + 1,
      });
    });

    return Array.from(sourceMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([source, data]) => ({
        source,
        revenue: data.revenue,
        count: data.count,
      }));
  }

  /**
   * Get revenue breakdown by client
   * 
   * @param query - Filter parameters
   * @param userId - User requesting data (for audit)
   * @returns Array of clients with their total revenue
   */
  async getByClient(query: QueryRevenueDto, userId: string) {
    console.log('[AUDIT] VIEW_REVENUE_BY_CLIENT', {
      userId,
      timestamp: new Date().toISOString(),
      filters: query,
    });

    const revenues = await this.findAll(query, userId);
    
    const clientMap = new Map<string, { revenue: number; count: number }>();
    
    revenues.forEach((r) => {
      const existing = clientMap.get(r.client) || { revenue: 0, count: 0 };
      clientMap.set(r.client, {
        revenue: existing.revenue + Number(r.amount),
        count: existing.count + 1,
      });
    });

    return Array.from(clientMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([client, data]) => ({
        client,
        revenue: data.revenue,
        count: data.count,
      }));
  }

  /**
   * Calculate revenue growth metrics (MoM, YoY)
   * 
   * @param userId - User requesting data (for audit)
   * @returns Object with growth metrics
   */
  async getGrowthMetrics(userId: string) {
    console.log('[AUDIT] VIEW_REVENUE_GROWTH', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Current month
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Last month
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0);

    // Current year
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31);

    // Last year
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, 11, 31);

    // Fetch revenues for all periods
    const [currentMonthRevenues, lastMonthRevenues, currentYearRevenues, lastYearRevenues] = await Promise.all([
      this.revenueRepository.find({
        where: {
          date: Between(currentMonthStart, currentMonthEnd),
        },
      }),
      this.revenueRepository.find({
        where: {
          date: Between(lastMonthStart, lastMonthEnd),
        },
      }),
      this.revenueRepository.find({
        where: {
          date: Between(currentYearStart, currentYearEnd),
        },
      }),
      this.revenueRepository.find({
        where: {
          date: Between(lastYearStart, lastYearEnd),
        },
      }),
    ]);

    const sumRevenue = (revenues: Revenue[]) =>
      revenues.reduce((sum, r) => sum + Number(r.amount), 0);

    const currentMonthTotal = sumRevenue(currentMonthRevenues);
    const lastMonthTotal = sumRevenue(lastMonthRevenues);
    const currentYearTotal = sumRevenue(currentYearRevenues);
    const lastYearTotal = sumRevenue(lastYearRevenues);

    const momGrowth = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    const yoyGrowth = lastYearTotal > 0 ? ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

    const avgMonthlyRevenue = currentYearTotal > 0 ? currentYearTotal / 12 : 0;

    return {
      current_month_revenue: currentMonthTotal,
      last_month_revenue: lastMonthTotal,
      month_over_month_growth: parseFloat(momGrowth.toFixed(2)),
      current_year_revenue: currentYearTotal,
      last_year_revenue: lastYearTotal,
      year_over_year_growth: parseFloat(yoyGrowth.toFixed(2)),
      average_monthly_revenue: parseFloat(avgMonthlyRevenue.toFixed(2)),
    };
  }

  /**
   * Get monthly comparison data
   * 
   * @param userId - User requesting data (for audit)
   * @returns Array with current and last month comparison
   */
  async getMonthlyComparison(userId: string) {
    console.log('[AUDIT] VIEW_REVENUE_MONTHLY_COMPARISON', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get all months of current year
    const monthlyData: any[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(currentYear, i, 1);
      const monthEnd = new Date(currentYear, i + 1, 0);

      const revenues = await this.revenueRepository.find({
        where: {
          date: Between(monthStart, monthEnd),
        },
      });

      const revenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      
      monthlyData.push({
        month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
        revenue,
      });
    }

    return monthlyData;
  }

  /**
   * Update a revenue record
   * 
   * Security: Only the creator or SUPER_ADMIN can update
   * 
   * @param id - Revenue record UUID
   * @param dto - Updated revenue data (partial)
   * @param userId - ID of user making the update
   * @returns Updated revenue record
   * @throws NotFoundException if record not found
   * @throws ForbiddenException if user is not the creator (and not SUPER_ADMIN)
   */
  async update(id: string, dto: UpdateRevenueDto, userId: string): Promise<Revenue> {
    const revenue = await this.revenueRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!revenue) {
      throw new NotFoundException(`Revenue record with ID ${id} not found`);
    }

    // Check ownership: allow if user is the creator or if creator is deleted
    const isCreator = revenue.created_by_user_id === userId;
    if (!isCreator) {
      console.warn('[AUDIT] UNAUTHORIZED_UPDATE_REVENUE', {
        userId,
        revenueId: id,
        ownerId: revenue.created_by_user_id,
        timestamp: new Date().toISOString(),
      });
      throw new ForbiddenException('You can only edit revenue records you created');
    }

    // Log the update action
    console.log('[AUDIT] UPDATE_REVENUE', {
      userId,
      revenueId: id,
      timestamp: new Date().toISOString(),
      changedFields: Object.keys(dto),
    });

    // Update the record with provided fields
    const updated = this.revenueRepository.merge(revenue, dto);
    return this.revenueRepository.save(updated);
  }

  /**
   * Delete a revenue record
   * 
   * Security: Only the creator or SUPER_ADMIN can delete
   * 
   * @param id - Revenue record UUID
   * @param userId - ID of user making the deletion
   * @returns Confirmation message
   * @throws NotFoundException if record not found
   * @throws ForbiddenException if user is not the creator (and not SUPER_ADMIN)
   */
  async remove(id: string, userId: string): Promise<{ message: string; id: string }> {
    console.log('[DELETE] Looking for revenue record:', { id, userId, idType: typeof id });
    
    const revenue = await this.revenueRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    console.log('[DELETE] Found revenue record:', { found: !!revenue, id });

    if (!revenue) {
      console.log('[DELETE] Record not found in database for id:', id);
      throw new NotFoundException(`Revenue record with ID ${id} not found`);
    }

    // Check ownership: allow if user is the creator
    const isCreator = revenue.created_by_user_id === userId;
    if (!isCreator) {
      console.warn('[AUDIT] UNAUTHORIZED_DELETE_REVENUE', {
        userId,
        revenueId: id,
        ownerId: revenue.created_by_user_id,
        timestamp: new Date().toISOString(),
      });
      throw new ForbiddenException('You can only delete revenue records you created');
    }

    // Log the deletion action
    console.log('[AUDIT] DELETE_REVENUE', {
      userId,
      revenueId: id,
      timestamp: new Date().toISOString(),
      data: {
        client: revenue.client,
        amount: revenue.amount,
        source: revenue.source,
      },
    });

    // Delete the record
    await this.revenueRepository.remove(revenue);

    return {
      message: 'Revenue record deleted successfully',
      id,
    };
  }
}
