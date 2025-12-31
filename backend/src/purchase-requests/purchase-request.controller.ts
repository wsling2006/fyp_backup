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
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import type { Response } from 'express';
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

    // DEBUG: Log file details before scan
    console.log('[UPLOAD] File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer?.length,
      firstBytes: file.buffer?.slice(0, 20).toString('hex'),
    });

    // Step 1: Validate and scan file with ClamAV (CRITICAL SECURITY STEP)
    await this.purchaseRequestService.validateAndScanFile(file);

    // DEBUG: Log file details after scan
    console.log('[UPLOAD] File after ClamAV scan:', {
      bufferLength: file.buffer?.length,
      firstBytes: file.buffer?.slice(0, 20).toString('hex'),
      bufferIsBuffer: Buffer.isBuffer(file.buffer),
      mimetype: file.mimetype,
      size: file.size,
    });

    // Step 2: Store file data in database (NEW APPROACH - matches working accountant_files)
    // No longer saving to disk to avoid file system issues
    // File is stored as BYTEA in PostgreSQL, just like accountant_files
    const fileExt = file.originalname.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExt}`; // Still generate for backwards compatibility

    console.log('[UPLOAD] Storing file in database (not disk):', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      bufferSize: file.buffer.length,
    });

    // CRITICAL: Log exactly what we're sending to the service
    const claimData = {
      purchase_request_id: dto.purchase_request_id,
      vendor_name: dto.vendor_name,
      amount_claimed: parseFloat(dto.amount_claimed.toString()),
      purchase_date: dto.purchase_date,
      claim_description: dto.claim_description,
      receipt_file_path: uniqueFilename,
      receipt_file_original_name: file.originalname,
      receipt_file_data: file.buffer, // BYTEA data
      receipt_file_size: file.size, // File size
      receipt_file_mimetype: file.mimetype, // MIME type
      file_buffer: file.buffer, // For hash generation
    };

    console.log('[UPLOAD] Data being sent to service:', {
      ...claimData,
      receipt_file_data: `Buffer(${claimData.receipt_file_data?.length || 0} bytes)`,
      file_buffer: `Buffer(${claimData.file_buffer?.length || 0} bytes)`,
    });

    // Step 3: Create claim in database with file data
    return this.purchaseRequestService.createClaim(
      userId,
      userRole,
      dto.otp,
      claimData,
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
   * Download claim receipt file
   * Accountants and SuperAdmins can download any receipt
   * Sales/Marketing can download their own receipts
   * 
   * NEW: Files stored in database (matching accountant_files pattern that works)
   */
  @Get('claims/:id/download')
  @Roles(Role.SALES, Role.MARKETING, Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async downloadClaimReceipt(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get claim with ownership check
    const claim = await this.purchaseRequestService.getClaimById(id, userId, userRole);

    console.log('[DOWNLOAD] Claim details:', {
      id: claim.id,
      originalName: claim.receipt_file_original_name,
      hasFileData: !!claim.receipt_file_data,
      fileDataSize: claim.receipt_file_data?.length || 0,
      storedSize: claim.receipt_file_size,
      mimetype: claim.receipt_file_mimetype,
    });

    // NEW: Check if file is stored in database (preferred method - matches accountant_files)
    if (claim.receipt_file_data && claim.receipt_file_data.length > 0) {
      console.log('[DOWNLOAD] Using database-stored file');
      
      // Log download
      await this.auditService.logFromRequest(req, userId, 'DOWNLOAD_RECEIPT', 'claim', id, {
        filename: claim.receipt_file_original_name,
        amount_claimed: claim.amount_claimed,
        method: 'database',
      });

      // Use stored MIME type or fallback
      const contentType = claim.receipt_file_mimetype || this.getMimeTypeFromFilename(claim.receipt_file_original_name);

      // Set headers (exact same as accountant files)
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(claim.receipt_file_original_name)}"`);

      console.log('[DOWNLOAD] Sending from DB:', {
        size: claim.receipt_file_data.length,
        contentType,
        firstBytes: claim.receipt_file_data.slice(0, 20).toString('hex'),
      });

      // Send directly from database (same as accountant files - THIS WORKS)
      return res.send(Buffer.from(claim.receipt_file_data));
    }

    // FALLBACK: Old disk-based method (for backwards compatibility)
    console.log('[DOWNLOAD] Falling back to disk file');
    
    try {
      await fs.access(claim.receipt_file_path);
    } catch (error) {
      throw new NotFoundException('Receipt file not found');
    }

    const fileBuffer = await fs.readFile(claim.receipt_file_path);

    await this.auditService.logFromRequest(req, userId, 'DOWNLOAD_RECEIPT', 'claim', id, {
      filename: claim.receipt_file_original_name,
      amount_claimed: claim.amount_claimed,
      method: 'disk',
    });

    const contentType = this.getMimeTypeFromFilename(claim.receipt_file_original_name);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(claim.receipt_file_original_name)}"`);

    return res.send(fileBuffer);
  }

  /**
   * Helper: Get MIME type from filename
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const types: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
    };
    return types[ext] || 'application/octet-stream';
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
