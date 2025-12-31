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
    });

    // Step 2: Save file to disk with UUID filename (after ClamAV scan passes)
    const fileExt = file.originalname.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    const filePath = join(this.uploadDir, uniqueFilename);
    
    // DEBUG: Log before write
    console.log('[UPLOAD] Writing to disk:', {
      filePath,
      bufferSize: file.buffer.length,
    });
    
    await fs.writeFile(filePath, file.buffer);

    // DEBUG: Verify file was written correctly
    const writtenBuffer = await fs.readFile(filePath);
    console.log('[UPLOAD] File written verification:', {
      originalSize: file.buffer.length,
      writtenSize: writtenBuffer.length,
      sizesMatch: file.buffer.length === writtenBuffer.length,
      firstBytesMatch: file.buffer.slice(0, 20).equals(writtenBuffer.slice(0, 20)),
      writtenFirstBytes: writtenBuffer.slice(0, 20).toString('hex'),
    });

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
   * Download claim receipt file
   * Accountants and SuperAdmins can download any receipt
   * Sales/Marketing can download their own receipts
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

    // DEBUG: Log claim details
    console.log('[DOWNLOAD] Claim details:', {
      id: claim.id,
      originalName: claim.receipt_file_original_name,
      filePath: claim.receipt_file_path,
      amountClaimed: claim.amount_claimed,
    });

    // Check if file exists
    try {
      await fs.access(claim.receipt_file_path);
      const stats = await fs.stat(claim.receipt_file_path);
      console.log('[DOWNLOAD] File exists:', {
        size: stats.size,
        modified: stats.mtime,
      });
    } catch (error) {
      console.error('[DOWNLOAD] File not found:', {
        path: claim.receipt_file_path,
        error: error.message,
      });
      throw new NotFoundException('Receipt file not found on server');
    }

    // Read the file
    const fileBuffer = await fs.readFile(claim.receipt_file_path);

    // DEBUG: Log file buffer details
    console.log('[DOWNLOAD] File buffer read:', {
      bufferLength: fileBuffer.length,
      firstBytes: fileBuffer.slice(0, 20).toString('hex'),
      isBuffer: Buffer.isBuffer(fileBuffer),
    });

    // Log download
    await this.auditService.logFromRequest(req, userId, 'DOWNLOAD_RECEIPT', 'claim', id, {
      filename: claim.receipt_file_original_name,
      amount_claimed: claim.amount_claimed,
    });

    // Determine correct MIME type based on file extension
    const fileExt = claim.receipt_file_original_name.toLowerCase().split('.').pop() || '';
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const contentType = mimeTypes[fileExt] || 'application/octet-stream';

    // DEBUG: Log response headers
    console.log('[DOWNLOAD] Sending response:', {
      contentType,
      contentLength: fileBuffer.length,
      filename: claim.receipt_file_original_name,
    });

    // Set response headers with correct MIME type
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(claim.receipt_file_original_name)}"`,
    );

    // Send file
    return res.send(fileBuffer);
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
