import { Controller, Get, Post, Body, Query, Param, UseGuards, Request, Put, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';

/**
 * Revenue Controller
 * 
 * Handles HTTP requests for revenue management.
 * Protected by JWT authentication and role-based authorization.
 * 
 * Security:
 * - All endpoints require JWT authentication
 * - Only ACCOUNTANT and SUPER_ADMIN roles can access
 * - User ID automatically extracted from JWT
 * - All actions logged for audit trail
 * 
 * For FYP: Demonstrates secure API design with RBAC,
 * input validation, and audit logging.
 */
@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  /**
   * Create a new revenue record
   * 
   * POST /revenue
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * @param dto - Revenue data (validated)
   * @param req - Request object with authenticated user
   * @returns Created revenue record
   */
  @Post()
  async create(@Body() dto: CreateRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.create(dto, userId);
  }

  /**
   * Get all revenue records with optional filtering
   * 
   * GET /revenue?start_date=2024-01-01&end_date=2024-12-31&status=PAID
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Supports query parameters:
   * - start_date: Filter from date (ISO format)
   * - end_date: Filter to date (ISO format)
   * - client: Filter by client name
   * - status: Filter by status (PAID/PENDING)
   * - source: Filter by revenue source
   * 
   * @param query - Filter parameters
   * @param req - Request object with authenticated user
   * @returns Array of revenue records
   */
  @Get()
  async findAll(@Query() query: QueryRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    const revenues = await this.revenueService.findAll(query, userId);
    
    // Map to safe response (exclude sensitive user data)
    return revenues.map((r) => ({
      id: r.id,
      invoice_id: r.invoice_id,
      client: r.client,
      source: r.source,
      amount: r.amount,
      currency: r.currency,
      date: r.date,
      status: r.status,
      notes: r.notes,
      created_by: r.created_by ? {
        id: r.created_by.id,
        email: r.created_by.email,
      } : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Get revenue summary analytics
   * 
   * GET /revenue/summary?start_date=2024-01-01&end_date=2024-12-31
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Returns aggregated statistics:
   * - Total revenue
   * - Paid revenue
   * - Pending revenue
   * - Record counts
   * 
   * @param query - Filter parameters
   * @param req - Request object with authenticated user
   * @returns Summary statistics
   */
  @Get('summary')
  async getSummary(@Query() query: QueryRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getSummary(query, userId);
  }

  /**
   * Get a single revenue record by ID
   * 
   * GET /revenue/:id
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * @param id - Revenue record UUID
   * @param req - Request object with authenticated user
   * @returns Revenue record with creator info
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId;
    const revenue = await this.revenueService.findOne(id, userId);
    
    // Map to safe response
    return {
      id: revenue.id,
      invoice_id: revenue.invoice_id,
      client: revenue.client,
      source: revenue.source,
      amount: revenue.amount,
      currency: revenue.currency,
      date: revenue.date,
      status: revenue.status,
      notes: revenue.notes,
      created_by: revenue.created_by ? {
        id: revenue.created_by.id,
        email: revenue.created_by.email,
      } : null,
      created_at: revenue.created_at,
      updated_at: revenue.updated_at,
    };
  }

  /**
   * Get revenue trends over time
   * 
   * GET /revenue/analytics/trends?granularity=daily&start_date=2024-01-01&end_date=2024-12-31
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * @param query - Filter parameters
   * @param granularity - 'daily' or 'monthly' (default: daily)
   * @param req - Request object with authenticated user
   * @returns Array of revenue data points
   */
  @Get('analytics/trends')
  async getTrends(@Query('granularity') granularity: 'daily' | 'monthly' = 'daily', @Query() query: QueryRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getTrends(query, userId, granularity);
  }

  /**
   * Get revenue breakdown by source
   * 
   * GET /revenue/analytics/by-source?start_date=2024-01-01&end_date=2024-12-31
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * @param query - Filter parameters
   * @param req - Request object with authenticated user
   * @returns Array of sources with revenue totals
   */
  @Get('analytics/by-source')
  async getBySource(@Query() query: QueryRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getBySource(query, userId);
  }

  /**
   * Get revenue breakdown by client
   * 
   * GET /revenue/analytics/by-client?start_date=2024-01-01&end_date=2024-12-31
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * @param query - Filter parameters
   * @param req - Request object with authenticated user
   * @returns Array of clients with revenue totals
   */
  @Get('analytics/by-client')
  async getByClient(@Query() query: QueryRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getByClient(query, userId);
  }

  /**
   * Get revenue growth metrics (MoM, YoY, Average)
   * 
   * GET /revenue/analytics/growth
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Returns:
   * - month_over_month_growth (%)
   * - year_over_year_growth (%)
   * - average_monthly_revenue
   * 
   * @param req - Request object with authenticated user
   * @returns Growth metrics
   */
  @Get('analytics/growth')
  async getGrowthMetrics(@Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getGrowthMetrics(userId);
  }

  /**
   * Get monthly comparison data
   * 
   * GET /revenue/analytics/monthly-comparison
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Returns monthly revenue for current year
   * 
   * @param req - Request object with authenticated user
   * @returns Array of monthly data
   */
  @Get('analytics/monthly-comparison')
  async getMonthlyComparison(@Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.getMonthlyComparison(userId);
  }

  /**
   * Update a revenue record
   * 
   * PUT /revenue/:id
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Security:
   * - Only the user who created the record can edit it
   * - SUPER_ADMIN can edit any record
   * 
   * @param id - Revenue record UUID
   * @param dto - Updated revenue data
   * @param req - Request object with authenticated user
   * @returns Updated revenue record
   * @throws ForbiddenException if user is not the creator
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRevenueDto, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.update(id, dto, userId);
  }

  /**
   * Delete a revenue record
   * 
   * DELETE /revenue/:id
   * 
   * Required role: ACCOUNTANT or SUPER_ADMIN
   * 
   * Security:
   * - Only the user who created the record can delete it
   * - SUPER_ADMIN can delete any record
   * 
   * @param id - Revenue record UUID
   * @param req - Request object with authenticated user
   * @returns Confirmation message
   * @throws ForbiddenException if user is not the creator
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId;
    return this.revenueService.remove(id, userId);
  }
}
