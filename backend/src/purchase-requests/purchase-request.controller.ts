import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { PurchaseRequestService } from './purchase-request.service';
import {
  CreatePurchaseRequestDto,
  ReviewPurchaseRequestDto,
  CreateClaimDto,
  VerifyClaimDto,
  RequestOtpDto,
  EditPurchaseRequestDto,
  EditClaimDto,
} from './purchase-request.dto';
import { AuditService } from '../audit/audit.service';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequestController {
  private uploadDir = join(process.cwd(), 'uploads', 'receipts');

  constructor(
    private purchaseRequestService: PurchaseRequestService,
    private auditService: AuditService,
  ) {
    // Ensure upload directory exists (async operation, but it's okay if it's not awaited in constructor)
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create upload directory:', err);
    }
  }

  /**
   * Request OTP for creating purchase request
   * Sales, Marketing, SuperAdmin can request
   */
  @Post('request-otp/create')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async requestCreateOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'CREATE_PURCHASE_REQUEST');
  }

  /**
   * Create purchase request (with OTP verification)
   * Sales, Marketing, SuperAdmin can create
   */
  @Post()
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!dto.otp) {
      throw new BadRequestException('OTP is required. Please request OTP first.');
    }

    return this.purchaseRequestService.createPurchaseRequest(
      userId,
      userRole,
      dto.otp,
      {
        title: dto.title,
        description: dto.description,
        department: dto.department,
        priority: dto.priority,
        estimated_amount: dto.estimated_amount,
      },
      req,
    );
  }

  /**
   * Get all purchase requests (role-based filtering)
   * Accountant/SuperAdmin see all, Sales/Marketing see only their own
   */
  @Get()
  @Roles(Role.SALES, Role.MARKETING, Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async getAllPurchaseRequests(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const requests = await this.purchaseRequestService.getAllPurchaseRequests(userId, userRole);

    // Log view action for Accountant/SuperAdmin only (they see ALL requests)
    if (userRole === Role.ACCOUNTANT || userRole === Role.SUPER_ADMIN) {
      await this.auditService.logFromRequest(
        req,
        userId,
        'VIEW_ALL_PURCHASE_REQUESTS',
        'purchase_request',
        undefined,
        { count: requests.length },
      );
    }

    return requests;
  }

  /**
   * Get purchase request by ID (with ownership check)
   */
  @Get(':id')
  @Roles(Role.SALES, Role.MARKETING, Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async getPurchaseRequestById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const pr = await this.purchaseRequestService.getPurchaseRequestById(id, userId, userRole);

    // Log view
    await this.auditService.logFromRequest(req, userId, 'VIEW_PURCHASE_REQUEST', 'purchase_request', id, {
      title: pr.title,
      status: pr.status,
    });

    return pr;
  }

  /**
   * Request OTP for reviewing purchase request
   * Only Accountant and SuperAdmin can review
   */
  @Post('request-otp/review')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async requestReviewOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'REVIEW_PURCHASE_REQUEST');
  }

  /**
   * Review purchase request (approve/reject) with OTP
   * Only Accountant and SuperAdmin can review
   */
  @Put(':id/review')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async reviewPurchaseRequest(
    @Param('id') id: string,
    @Body() dto: ReviewPurchaseRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;

    return this.purchaseRequestService.reviewPurchaseRequest(
      id,
      userId,
      dto.otp,
      {
        status: dto.status,
        review_notes: dto.review_notes,
        approved_amount: dto.approved_amount,
      },
      req,
    );
  }

  /**
   * Request OTP for uploading receipt
   * Sales, Marketing, SuperAdmin can upload
   */
  @Post('request-otp/upload-receipt')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async requestUploadReceiptOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'UPLOAD_RECEIPT');
  }

  /**
   * Request OTP for editing purchase request
   * Owner or SuperAdmin can edit
   */
  @Post('request-otp/edit-purchase-request')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async requestEditPurchaseRequestOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'EDIT_PURCHASE_REQUEST');
  }

  /**
   * Request OTP for editing claim
   * Owner or SuperAdmin can edit
   */
  @Post('request-otp/edit-claim')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async requestEditClaimOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'EDIT_CLAIM');
  }

  /**
   * Upload receipt and create claim (with OTP verification + ClamAV scan)
   * Sales, Marketing, SuperAdmin can upload
   */
  @Post('claims/upload')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: memoryStorage(), // Store in memory for ClamAV scanning
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
      },
    }),
  )
  async uploadReceipt(
    @UploadedFile() file: any,
    @Body() dto: CreateClaimDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }

    if (!dto.otp) {
      throw new BadRequestException('OTP is required. Please request OTP first.');
    }

    const userId = req.user.userId;
    const userRole = req.user.role;

    // Step 1: Validate and scan file with ClamAV (CRITICAL SECURITY STEP)
    await this.purchaseRequestService.validateAndScanFile(file);

    // Step 2: Save file to disk with UUID filename (after ClamAV scan passes)
    const fileExt = file.originalname.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    const filePath = join(this.uploadDir, uniqueFilename);
    
    await fs.writeFile(filePath, file.buffer);

    // Step 3: Create claim in database (with duplicate file check and one-claim-per-PR check)
    return this.purchaseRequestService.createClaim(
      userId,
      userRole,
      dto.otp,
      {
        purchase_request_id: dto.purchase_request_id,
        vendor_name: dto.vendor_name,
        amount_claimed: parseFloat(dto.amount_claimed.toString()),
        purchase_date: dto.purchase_date,
        claim_description: dto.claim_description,
        receipt_file_path: filePath,
        receipt_file_original_name: file.originalname,
        file_buffer: file.buffer, // Pass buffer for hash generation
      },
      req,
    );
  }

  /**
   * Get all claims (role-based filtering)
   */
  @Get('claims/all')
  @Roles(Role.SALES, Role.MARKETING, Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async getAllClaims(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const claims = await this.purchaseRequestService.getAllClaims(userId, userRole);

    // Log view for Accountant/SuperAdmin
    if (userRole === Role.ACCOUNTANT || userRole === Role.SUPER_ADMIN) {
      await this.auditService.logFromRequest(
        req,
        userId,
        'VIEW_ALL_CLAIMS',
        'claim',
        undefined,
        { count: claims.length },
      );
    }

    return claims;
  }

  /**
   * Get claim by ID (with ownership check)
   */
  @Get('claims/:id')
  @Roles(Role.SALES, Role.MARKETING, Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async getClaimById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const claim = await this.purchaseRequestService.getClaimById(id, userId, userRole);

    // Log view
    await this.auditService.logFromRequest(req, userId, 'VIEW_RECEIPT', 'claim', id, {
      amount_claimed: claim.amount_claimed,
      vendor: claim.vendor_name,
    });

    return claim;
  }

  /**
   * Request OTP for verifying claim
   * Only Accountant and SuperAdmin can verify
   */
  @Post('request-otp/verify-claim')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async requestVerifyClaimOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.purchaseRequestService.requestOtp(userId, body.password, 'VERIFY_CLAIM');
  }

  /**
   * Edit purchase request (with OTP verification)
   * Owner or SuperAdmin can edit (only DRAFT or SUBMITTED status)
   */
  @Put(':id/edit')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async editPurchaseRequest(
    @Param('id') id: string,
    @Body() dto: EditPurchaseRequestDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!dto.otp) {
      throw new BadRequestException('OTP is required. Please request OTP first.');
    }

    return this.purchaseRequestService.editPurchaseRequest(
      id,
      userId,
      userRole,
      dto.otp,
      {
        title: dto.title,
        description: dto.description,
        department: dto.department,
        priority: dto.priority,
        estimated_amount: dto.estimated_amount,
      },
      req,
    );
  }

  /**
   * Edit claim (with OTP verification)
   * Owner or SuperAdmin can edit (only PENDING status, cannot change receipt file)
   */
  @Put('claims/:id/edit')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  async editClaim(
    @Param('id') id: string,
    @Body() dto: EditClaimDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!dto.otp) {
      throw new BadRequestException('OTP is required. Please request OTP first.');
    }

    return this.purchaseRequestService.editClaim(
      id,
      userId,
      userRole,
      dto.otp,
      {
        vendor_name: dto.vendor_name,
        amount_claimed: dto.amount_claimed ? parseFloat(dto.amount_claimed.toString()) : undefined,
        purchase_date: dto.purchase_date,
        claim_description: dto.claim_description,
      },
      req,
    );
  }
}
