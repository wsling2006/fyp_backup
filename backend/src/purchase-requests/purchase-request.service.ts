import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseRequest, PurchaseRequestStatus } from './purchase-request.entity';
import { Claim, ClaimStatus } from './claim.entity';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { ClamavService } from '../clamav/clamav.service';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Role } from '../users/roles.enum';

// Multer file interface
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class PurchaseRequestService {
  private otpStore: Map<string, { otp: string; expiresAt: Date; action: string }> = new Map();

  constructor(
    @InjectRepository(PurchaseRequest)
    private purchaseRequestRepo: Repository<PurchaseRequest>,
    @InjectRepository(Claim)
    private claimRepo: Repository<Claim>,
    private usersService: UsersService,
    private auditService: AuditService,
    private configService: ConfigService,
    private clamavService: ClamavService,
  ) {}

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate OTP expiry (5 minutes from now)
   */
  private generateOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    return expiry;
  }

  /**
   * Send OTP email
   */
  private async sendOtpEmail(user: any, otp: string, action: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    const actionDescriptions: { [key: string]: string } = {
      CREATE_PURCHASE_REQUEST: 'create a new purchase request',
      REVIEW_PURCHASE_REQUEST: 'review and approve/reject a purchase request',
      UPLOAD_RECEIPT: 'upload a receipt and submit a claim',
      VERIFY_CLAIM: 'verify and process a claim',
    };

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: user.email,
      subject: `OTP Verification - ${action}`,
      html: `
        <h2>Purchase Request System - OTP Verification</h2>
        <p>Hello ${user.username},</p>
        <p>You are attempting to <strong>${actionDescriptions[action] || action}</strong>.</p>
        <p>Your OTP code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p><em>If you did not request this action, please contact your system administrator immediately.</em></p>
        <hr>
        <p style="color: #666; font-size: 12px;">FYP System - Secure Purchase Request Management</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Validate and scan uploaded file
   * Ensures file meets security requirements before storage
   */
  async validateAndScanFile(file: UploadedFile): Promise<void> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type - only PDF and images allowed for receipts
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPG, and PNG files are allowed for receipts.',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds limit. Maximum allowed size is ${maxSize / 1024 / 1024}MB.`,
      );
    }

    // ClamAV scan for malware
    const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
    if (!isClean) {
      throw new BadRequestException(
        'File failed security scan. The uploaded file may contain malware or viruses.',
      );
    }
  }

  /**
   * Request OTP for an action
   */
  async requestOtp(userId: string, password: string, action: string): Promise<{ message: string }> {
    // Verify user and password
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await argon2.verify(user.password_hash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = this.generateOtpExpiry();

    // Store OTP in memory
    this.otpStore.set(`${userId}:${action}`, {
      otp,
      expiresAt,
      action,
    });

    // Send OTP email
    await this.sendOtpEmail(user, otp, action);

    return {
      message: 'OTP sent to your email. Please check and enter the code to proceed.',
    };
  }

  /**
   * Verify OTP for an action
   */
  private verifyOtp(userId: string, otp: string, action: string): void {
    const key = `${userId}:${action}`;
    const stored = this.otpStore.get(key);

    if (!stored) {
      throw new UnauthorizedException('OTP not found or expired. Please request a new OTP.');
    }

    if (stored.expiresAt < new Date()) {
      this.otpStore.delete(key);
      throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    // OTP is valid - delete it (one-time use)
    this.otpStore.delete(key);
  }

  /**
   * Create purchase request (Sales/Marketing/SuperAdmin)
   */
  async createPurchaseRequest(
    userId: string,
    userRole: string,
    otp: string,
    data: {
      title: string;
      description: string;
      department: string;
      priority: number;
      estimated_amount: number;
    },
    req: any,
  ): Promise<PurchaseRequest> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'CREATE_PURCHASE_REQUEST');

    // Validate department matches user role (except super_admin)
    if (userRole !== Role.SUPER_ADMIN) {
      if (userRole === Role.SALES && data.department !== 'sales_department') {
        throw new ForbiddenException('Sales can only create requests for sales department');
      }
      if (userRole === Role.MARKETING && data.department !== 'marketing') {
        throw new ForbiddenException('Marketing can only create requests for marketing department');
      }
    }

    // Create purchase request
    const purchaseRequest = this.purchaseRequestRepo.create({
      title: data.title,
      description: data.description,
      department: data.department,
      priority: data.priority,
      estimated_amount: data.estimated_amount,
      created_by_user_id: userId,
      status: PurchaseRequestStatus.SUBMITTED,
    });

    const saved = await this.purchaseRequestRepo.save(purchaseRequest);

    // Audit log
    await this.auditService.logFromRequest(req, userId, 'CREATE_PURCHASE_REQUEST', 'purchase_request', saved.id, {
      title: data.title,
      department: data.department,
      priority: data.priority,
      estimated_amount: data.estimated_amount,
    });

    return saved;
  }

  /**
   * Get all purchase requests (Accountant/SuperAdmin see all, others see only their own)
   */
  async getAllPurchaseRequests(userId: string, userRole: string): Promise<PurchaseRequest[]> {
    let query = this.purchaseRequestRepo.createQueryBuilder('pr')
      .leftJoinAndSelect('pr.createdBy', 'creator')
      .leftJoinAndSelect('pr.reviewedBy', 'reviewer')
      .leftJoinAndSelect('pr.claims', 'claims')
      .orderBy('pr.created_at', 'DESC');

    // RBAC: Sales/Marketing see only their own
    if (userRole === Role.SALES || userRole === Role.MARKETING) {
      query = query.where('pr.created_by_user_id = :userId', { userId });
    }
    // Accountant and SuperAdmin see all (no additional filter)

    return query.getMany();
  }

  /**
   * Get purchase request by ID (with ownership check)
   */
  async getPurchaseRequestById(id: string, userId: string, userRole: string): Promise<PurchaseRequest> {
    const pr = await this.purchaseRequestRepo.findOne({
      where: { id },
      relations: ['createdBy', 'reviewedBy', 'claims', 'claims.uploadedBy', 'claims.verifiedBy'],
    });

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // RBAC: Sales/Marketing can only view their own
    if (userRole === Role.SALES || userRole === Role.MARKETING) {
      if (pr.created_by_user_id !== userId) {
        throw new ForbiddenException('You can only view your own purchase requests');
      }
    }

    return pr;
  }

  /**
   * Review purchase request (Accountant/SuperAdmin)
   */
  async reviewPurchaseRequest(
    id: string,
    userId: string,
    otp: string,
    data: {
      status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
      review_notes?: string;
      approved_amount?: number;
    },
    req: any,
  ): Promise<PurchaseRequest> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'REVIEW_PURCHASE_REQUEST');

    const pr = await this.purchaseRequestRepo.findOne({ where: { id } });
    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // Update status
    pr.status = data.status as PurchaseRequestStatus;
    pr.review_notes = data.review_notes || '';
    pr.reviewed_by_user_id = userId;
    pr.reviewed_at = new Date();

    if (data.status === 'APPROVED' && data.approved_amount) {
      if (data.approved_amount > pr.estimated_amount) {
        throw new BadRequestException('Approved amount cannot exceed estimated amount');
      }
      pr.approved_amount = data.approved_amount;
    }

    const saved = await this.purchaseRequestRepo.save(pr);

    // Audit log
    const action = data.status === 'APPROVED' ? 'APPROVE_PURCHASE_REQUEST' : 
                   data.status === 'REJECTED' ? 'REJECT_PURCHASE_REQUEST' : 
                   'REVIEW_PURCHASE_REQUEST';

    await this.auditService.logFromRequest(req, userId, action, 'purchase_request', id, {
      status: data.status,
      approved_amount: data.approved_amount,
      review_notes: data.review_notes,
    });

    return saved;
  }

  /**
   * Upload receipt and create claim (Sales/Marketing/SuperAdmin - only for APPROVED requests)
   */
  async createClaim(
    userId: string,
    userRole: string,
    otp: string,
    data: {
      purchase_request_id: string;
      vendor_name: string;
      amount_claimed: number;
      purchase_date: string;
      claim_description: string;
      receipt_file_path: string;
      receipt_file_original_name: string;
    },
    req: any,
  ): Promise<Claim> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'UPLOAD_RECEIPT');

    // Get purchase request
    const pr = await this.purchaseRequestRepo.findOne({
      where: { id: data.purchase_request_id },
    });

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // Ownership check (except super_admin)
    if (userRole !== Role.SUPER_ADMIN) {
      if (pr.created_by_user_id !== userId) {
        throw new ForbiddenException('You can only submit claims for your own purchase requests');
      }
    }

    // Status check
    if (pr.status !== PurchaseRequestStatus.APPROVED) {
      throw new BadRequestException('You can only submit claims for APPROVED purchase requests');
    }

    // Amount validation
    if (data.amount_claimed > pr.approved_amount) {
      throw new BadRequestException('Claimed amount cannot exceed approved amount');
    }

    // Create claim
    const claim = this.claimRepo.create({
      purchase_request_id: data.purchase_request_id,
      vendor_name: data.vendor_name,
      amount_claimed: data.amount_claimed,
      purchase_date: new Date(data.purchase_date),
      claim_description: data.claim_description,
      receipt_file_path: data.receipt_file_path,
      receipt_file_original_name: data.receipt_file_original_name,
      uploaded_by_user_id: userId,
      status: ClaimStatus.PENDING,
    });

    const saved = await this.claimRepo.save(claim);

    // Audit log
    await this.auditService.logFromRequest(req, userId, 'UPLOAD_RECEIPT', 'claim', saved.id, {
      purchase_request_id: data.purchase_request_id,
      vendor_name: data.vendor_name,
      amount_claimed: data.amount_claimed,
    });

    return saved;
  }

  /**
   * Get all claims (Accountant/SuperAdmin see all, others see only their own)
   */
  async getAllClaims(userId: string, userRole: string): Promise<Claim[]> {
    let query = this.claimRepo.createQueryBuilder('claim')
      .leftJoinAndSelect('claim.purchaseRequest', 'pr')
      .leftJoinAndSelect('claim.uploadedBy', 'uploader')
      .leftJoinAndSelect('claim.verifiedBy', 'verifier')
      .orderBy('claim.uploaded_at', 'DESC');

    // RBAC: Sales/Marketing see only their own
    if (userRole === Role.SALES || userRole === Role.MARKETING) {
      query = query.where('claim.uploaded_by_user_id = :userId', { userId });
    }

    return query.getMany();
  }

  /**
   * Verify claim (Accountant/SuperAdmin)
   */
  async verifyClaim(
    id: string,
    userId: string,
    otp: string,
    data: {
      status: 'VERIFIED' | 'PROCESSED' | 'REJECTED';
      verification_notes?: string;
    },
    req: any,
  ): Promise<Claim> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'VERIFY_CLAIM');

    const claim = await this.claimRepo.findOne({ where: { id } });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Update claim
    claim.status = data.status as ClaimStatus;
    claim.verification_notes = data.verification_notes || '';
    claim.verified_by_user_id = userId;
    claim.verified_at = new Date();

    const saved = await this.claimRepo.save(claim);

    // Update purchase request status to PAID if claim is processed
    if (data.status === 'PROCESSED') {
      await this.purchaseRequestRepo.update(
        { id: claim.purchase_request_id },
        { status: PurchaseRequestStatus.PAID },
      );
    }

    // Audit log
    await this.auditService.logFromRequest(req, userId, 'PROCESS_CLAIM', 'claim', id, {
      status: data.status,
      verification_notes: data.verification_notes,
    });

    return saved;
  }

  /**
   * Get claim by ID (with ownership check)
   */
  async getClaimById(id: string, userId: string, userRole: string): Promise<Claim> {
    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['purchaseRequest', 'uploadedBy', 'verifiedBy'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // RBAC: Sales/Marketing can only view their own
    if (userRole === Role.SALES || userRole === Role.MARKETING) {
      if (claim.uploaded_by_user_id !== userId) {
        throw new ForbiddenException('You can only view your own claims');
      }
    }

    return claim;
  }
}
