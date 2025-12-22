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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
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
} from './purchase-request.dto';
import { AuditService } from '../audit/audit.service';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequestController {
  constructor(
    private purchaseRequestService: PurchaseRequestService,
    private auditService: AuditService,
  ) {
    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
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
   * Upload receipt and create claim (with OTP verification)
   * Sales, Marketing, SuperAdmin can upload
   */
  @Post('claims/upload')
  @Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'receipts'),
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, JPG, and PNG files are allowed'), false);
        }
      },
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
        receipt_file_path: file.path,
        receipt_file_original_name: file.originalname,
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
   * Verify/process claim (with OTP verification)
   * Only Accountant and SuperAdmin can verify
   */
  @Put('claims/:id/verify')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  async verifyClaim(@Param('id') id: string, @Body() dto: VerifyClaimDto, @Req() req: any) {
    const userId = req.user.userId;

    return this.purchaseRequestService.verifyClaim(
      id,
      userId,
      dto.otp,
      {
        status: dto.status,
        verification_notes: dto.verification_notes,
      },
      req,
    );
  }
}
