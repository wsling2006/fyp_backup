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
import { Claim, ClaimStatus, MalwareScanStatus } from './claim.entity';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { ClamavService } from '../clamav/clamav.service';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
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
   * Generate SHA256 hash from file buffer for duplicate detection
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if a file with the same hash already exists in claims
   */
  private async findClaimByFileHash(hash: string): Promise<Claim | null> {
    return this.claimRepo.findOne({
      where: { file_hash: hash },
      relations: ['uploadedBy', 'purchaseRequest'],
    });
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
      .leftJoinAndSelect('claims.uploadedBy', 'claimUploader')
      .leftJoinAndSelect('claims.verifiedBy', 'claimVerifier')
      .orderBy('pr.created_at', 'DESC')
      .addOrderBy('claims.uploaded_at', 'DESC');

    // RBAC: Sales/Marketing see only their own
    if (userRole === Role.SALES || userRole === Role.MARKETING) {
      query = query.where('pr.created_by_user_id = :userId', { userId });
    }
    // Accountant and SuperAdmin see all (no additional filter)

    const results = await query.getMany();
    
    // DEBUG LOG - Check if claims are loaded
    console.log('[getAllPurchaseRequests] Total requests:', results.length);
    results.forEach((pr, index) => {
      console.log(`[getAllPurchaseRequests] Request ${index + 1}:`, {
        id: pr.id,
        title: pr.title,
        status: pr.status,
        claimsCount: pr.claims?.length || 0,
        claimsData: pr.claims
      });
    });
    
    return results;
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
   * OTP verification removed to simplify the claim upload process
   */
  async createClaim(
    userId: string,
    userRole: string,
    data: {
      purchase_request_id: string;
      vendor_name: string;
      amount_claimed: number;
      purchase_date: string;
      claim_description: string;
      receipt_file_path: string;
      receipt_file_original_name: string;
      receipt_file_data?: Buffer; // NEW: Store file in database
      receipt_file_size?: number; // NEW: Store file size
      receipt_file_mimetype?: string; // NEW: Store MIME type
      file_buffer: Buffer; // Add buffer for hash generation
    },
    req: any,
  ): Promise<Claim> {
    // OTP verification removed: Users can now upload claims without OTP verification
    // This simplifies the claim upload process and removes unnecessary friction

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

    // REMOVED: One claim per purchase request restriction
    // Users can now submit multiple claims (multiple receipts) for the same purchase request
    // This allows users to split expenses across multiple vendors/receipts
    
    // Amount validation: Check total claimed amount across all claims
    const existingClaims = await this.claimRepo.find({
      where: { purchase_request_id: data.purchase_request_id },
    });

    const totalClaimedSoFar = existingClaims.reduce((sum, claim) => {
      return sum + Number(claim.amount_claimed);
    }, 0);

    const newTotalClaimed = totalClaimedSoFar + data.amount_claimed;

    // Convert approved_amount to number (PostgreSQL returns DECIMAL as string)
    const approvedAmount = Number(pr.approved_amount);

    if (newTotalClaimed > approvedAmount) {
      throw new BadRequestException(
        `Total claimed amount ($${newTotalClaimed.toFixed(2)}) would exceed approved amount ($${approvedAmount.toFixed(2)}). ` +
        `Already claimed: $${totalClaimedSoFar.toFixed(2)}. ` +
        `You can claim up to $${(approvedAmount - totalClaimedSoFar).toFixed(2)} more.`
      );
    }

    // DUPLICATE FILE CHECK (by hash)
    const fileHash = this.generateFileHash(data.file_buffer);
    const duplicateClaim = await this.findClaimByFileHash(fileHash);

    if (duplicateClaim) {
      throw new BadRequestException(
        `This receipt file has already been uploaded for claim ID: ${duplicateClaim.id} ` +
        `(Purchase Request: ${duplicateClaim.purchaseRequest?.title || 'N/A'}). ` +
        `Duplicate receipts are not allowed.`,
      );
    }

    // DEBUG: Log what data we received
    console.log('[SERVICE] createClaim received data:', {
      purchase_request_id: data.purchase_request_id,
      vendor_name: data.vendor_name,
      amount_claimed: data.amount_claimed,
      hasFileData: !!data.receipt_file_data,
      fileDataLength: data.receipt_file_data?.length || 0,
      fileSize: data.receipt_file_size,
      mimetype: data.receipt_file_mimetype,
      originalName: data.receipt_file_original_name,
    });

    // Create claim
    const claim = this.claimRepo.create({
      purchase_request_id: data.purchase_request_id,
      vendor_name: data.vendor_name,
      amount_claimed: data.amount_claimed,
      purchase_date: new Date(data.purchase_date),
      claim_description: data.claim_description,
      receipt_file_path: data.receipt_file_path,
      receipt_file_original_name: data.receipt_file_original_name,
      receipt_file_data: data.receipt_file_data, // NEW: Store file data in DB
      receipt_file_size: data.receipt_file_size, // NEW: Store file size
      receipt_file_mimetype: data.receipt_file_mimetype, // NEW: Store MIME type
      file_hash: fileHash, // Store hash for future duplicate checks
      uploaded_by_user_id: userId,
      status: ClaimStatus.PENDING,
      malware_scan_status: MalwareScanStatus.CLEAN, // File already passed ClamAV scan before upload
    });

    console.log('[SERVICE] Created claim object:', {
      id: claim.id,
      hasFileData: !!claim.receipt_file_data,
      fileDataLength: claim.receipt_file_data?.length || 0,
      fileSize: claim.receipt_file_size,
      mimetype: claim.receipt_file_mimetype,
    });

    const saved = await this.claimRepo.save(claim);

    console.log('[SERVICE] Saved claim to database:', {
      id: saved.id,
      hasFileData: !!saved.receipt_file_data,
      fileDataLength: saved.receipt_file_data?.length || 0,
      fileSize: saved.receipt_file_size,
      mimetype: saved.receipt_file_mimetype,
    });

    // Audit log
    await this.auditService.logFromRequest(req, userId, 'UPLOAD_RECEIPT', 'claim', saved.id, {
      purchase_request_id: data.purchase_request_id,
      vendor_name: data.vendor_name,
      amount_claimed: data.amount_claimed,
      file_hash: fileHash.substring(0, 16) + '...', // Log first 16 chars only
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

  /**
   * Get claim by ID for Accountant (Secure endpoint - no ownership check)
   * 
   * This method is specifically for the secure accountant download endpoint.
   * It does NOT perform ownership checks as accountants can access any claim.
   * 
   * Security is enforced at the controller level:
   * - Role must be ACCOUNTANT or SUPER_ADMIN
   * - MFA session must be verified
   * - Claim state must be valid
   * - Malware scan must be CLEAN
   * 
   * @param claimId - UUID of the claim
   * @returns Claim with all relations
   */
  async getClaimByIdForAccountant(claimId: string): Promise<Claim> {
    const claim = await this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['purchaseRequest', 'uploadedBy', 'verifiedBy'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  /**
   * Edit purchase request (Owner only, must be DRAFT or SUBMITTED status)
   */
  async editPurchaseRequest(
    id: string,
    userId: string,
    userRole: string,
    otp: string,
    data: {
      title?: string;
      description?: string;
      department?: string;
      priority?: number;
      estimated_amount?: number;
    },
    req: any,
  ): Promise<PurchaseRequest> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'EDIT_PURCHASE_REQUEST');

    const pr = await this.purchaseRequestRepo.findOne({ where: { id } });
    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // Ownership check (except super_admin)
    if (userRole !== Role.SUPER_ADMIN) {
      if (pr.created_by_user_id !== userId) {
        throw new ForbiddenException('You can only edit your own purchase requests');
      }
    }

    // Can only edit if DRAFT or SUBMITTED (not APPROVED/REJECTED/PAID)
    if (![PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.SUBMITTED].includes(pr.status)) {
      throw new BadRequestException(
        'You can only edit purchase requests that are in DRAFT or SUBMITTED status. ' +
        'Once approved or rejected, requests cannot be edited.',
      );
    }

    // Store old values for audit log
    const oldValues = {
      title: pr.title,
      description: pr.description,
      department: pr.department,
      priority: pr.priority,
      estimated_amount: pr.estimated_amount,
    };

    // Update fields
    if (data.title !== undefined) pr.title = data.title;
    if (data.description !== undefined) pr.description = data.description;
    if (data.department !== undefined) pr.department = data.department;
    if (data.priority !== undefined) pr.priority = data.priority;
    if (data.estimated_amount !== undefined) pr.estimated_amount = data.estimated_amount;

    const saved = await this.purchaseRequestRepo.save(pr);

    // Audit log with before/after values
    await this.auditService.logFromRequest(req, userId, 'EDIT_PURCHASE_REQUEST', 'purchase_request', id, {
      old_values: oldValues,
      new_values: {
        title: saved.title,
        description: saved.description,
        department: saved.department,
        priority: saved.priority,
        estimated_amount: saved.estimated_amount,
      },
      changed_fields: Object.keys(data),
    });

    return saved;
  }

  /**
   * Edit claim (Owner only, must be PENDING status, cannot change receipt file)
   */
  async editClaim(
    id: string,
    userId: string,
    userRole: string,
    otp: string,
    data: {
      vendor_name?: string;
      amount_claimed?: number;
      purchase_date?: string;
      claim_description?: string;
    },
    req: any,
  ): Promise<Claim> {
    // Verify OTP
    this.verifyOtp(userId, otp, 'EDIT_CLAIM');

    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['purchaseRequest'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Ownership check (except super_admin)
    if (userRole !== Role.SUPER_ADMIN) {
      if (claim.uploaded_by_user_id !== userId) {
        throw new ForbiddenException('You can only edit your own claims');
      }
    }

    // Can only edit if PENDING (not VERIFIED/PROCESSED/REJECTED)
    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException(
        'You can only edit claims that are in PENDING status. ' +
        'Once verified, processed, or rejected, claims cannot be edited.',
      );
    }

    // Validate amount against approved amount
    if (data.amount_claimed !== undefined && claim.purchaseRequest) {
      if (data.amount_claimed > claim.purchaseRequest.approved_amount) {
        throw new BadRequestException('Claimed amount cannot exceed approved amount');
      }
    }

    // Store old values for audit log
    const oldValues = {
      vendor_name: claim.vendor_name,
      amount_claimed: claim.amount_claimed,
      purchase_date: claim.purchase_date,
      claim_description: claim.claim_description,
    };

    // Update fields
    if (data.vendor_name !== undefined) claim.vendor_name = data.vendor_name;
    if (data.amount_claimed !== undefined) claim.amount_claimed = data.amount_claimed;
    if (data.purchase_date !== undefined) claim.purchase_date = new Date(data.purchase_date);
    if (data.claim_description !== undefined) claim.claim_description = data.claim_description;

    const saved = await this.claimRepo.save(claim);

    // Audit log with before/after values
    await this.auditService.logFromRequest(req, userId, 'EDIT_CLAIM', 'claim', id, {
      old_values: oldValues,
      new_values: {
        vendor_name: saved.vendor_name,
        amount_claimed: saved.amount_claimed,
        purchase_date: saved.purchase_date,
        claim_description: saved.claim_description,
      },
      changed_fields: Object.keys(data),
    });

    return saved;
  }

  /**
   * Delete a claim (Accountant or Super Admin only)
   * 
   * Business Rules:
   * - Only accountants and super admins can delete claims
   * - Can delete claims in any status except PROCESSED
   * - PROCESSED claims are finalized and should not be deleted
   * 
   * @param claimId - UUID of the claim to delete
   * @param userId - ID of the user performing the deletion
   * @param userRole - Role of the user
   * @param req - Request object for audit logging
   */
  async deleteClaim(
    claimId: string,
    userId: string,
    userRole: string,
    req: any,
  ): Promise<void> {
    // Check user has permission
    if (userRole !== Role.ACCOUNTANT && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only accountants and super admins can delete claims');
    }

    // Find the claim
    const claim = await this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['purchaseRequest', 'uploadedBy'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // Check claim status - cannot delete PROCESSED claims (finalized)
    if (claim.status === ClaimStatus.PROCESSED) {
      throw new BadRequestException(
        'Cannot delete PROCESSED claims. These claims have been finalized and paid.'
      );
    }

    // Log the deletion for audit trail
    await this.auditService.logFromRequest(
      req,
      userId,
      'DELETE_CLAIM',
      'claim',
      claimId,
      {
        claim_id: claimId,
        vendor_name: claim.vendor_name,
        amount_claimed: claim.amount_claimed,
        purchase_request_id: claim.purchase_request_id,
        uploaded_by: claim.uploadedBy?.email || 'Unknown',
      },
    );

    // Delete the claim
    await this.claimRepo.delete(claimId);
  }

  /**
   * Delete a purchase request (Accountant or Super Admin only)
   * 
   * Business Rules:
   * - Only accountants and super admins can delete purchase requests
   * - Can delete: DRAFT, SUBMITTED, REJECTED (no active workflow)
   * - Can delete: APPROVED with NO claims (no active claims workflow)
   * - Cannot delete: APPROVED with claims, UNDER_REVIEW, PAID (have active workflow)
   * 
   * @param prId - UUID of the purchase request to delete
   * @param userId - ID of the user performing the deletion
   * @param userRole - Role of the user
   * @param req - Request object for audit logging
   */
  async deletePurchaseRequest(
    prId: string,
    userId: string,
    userRole: string,
    req: any,
  ): Promise<void> {
    // Check user has permission
    if (userRole !== Role.ACCOUNTANT && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only accountants and super admins can delete purchase requests');
    }

    // Find the purchase request (disable cache to get fresh data)
    const pr = await this.purchaseRequestRepo.findOne({
      where: { id: prId },
      relations: ['createdBy', 'claims'],
      cache: false, // Disable cache to ensure fresh claims data
    });

    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }

    // DEBUG: Log the purchase request details
    console.log('[deletePurchaseRequest] PR ID:', prId);
    console.log('[deletePurchaseRequest] PR Status:', pr.status);
    console.log('[deletePurchaseRequest] Claims count:', pr.claims?.length || 0);
    console.log('[deletePurchaseRequest] Claims data:', pr.claims);

    // Check if there are any claims (should be deleted first)
    if (pr.claims && pr.claims.length > 0) {
      throw new BadRequestException(
        `Cannot delete purchase request with existing claims. ` +
        `Please delete all claims first (found ${pr.claims.length} claim(s)).`
      );
    }

    // Check status - allow deletion based on status and claims
    const alwaysDeletableStatuses = [
      PurchaseRequestStatus.DRAFT,
      PurchaseRequestStatus.SUBMITTED,
      PurchaseRequestStatus.REJECTED,
    ];

    // APPROVED or PAID requests can be deleted ONLY if no claims exist
    const canDeleteApprovedOrPaid = (pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.PAID) && 
                              (!pr.claims || pr.claims.length === 0);

    console.log('[deletePurchaseRequest] canDeleteApprovedOrPaid:', canDeleteApprovedOrPaid);
    console.log('[deletePurchaseRequest] alwaysDeletableStatuses.includes:', alwaysDeletableStatuses.includes(pr.status));

    if (!alwaysDeletableStatuses.includes(pr.status) && !canDeleteApprovedOrPaid) {
      throw new BadRequestException(
        `Cannot delete purchase request with status ${pr.status}. ` +
        `Only DRAFT, SUBMITTED, REJECTED, or APPROVED/PAID (with no claims) requests can be deleted. ` +
        `UNDER_REVIEW requests have active workflows.`
      );
    }

    console.log('[deletePurchaseRequest] ✅ Deletion allowed, proceeding...');

    // Log the deletion for audit trail
    await this.auditService.logFromRequest(
      req,
      userId,
      'DELETE_PURCHASE_REQUEST',
      'purchase_request',
      prId,
      {
        purchase_request_id: prId,
        title: pr.title,
        status: pr.status,
        estimated_amount: pr.estimated_amount,
        created_by: pr.createdBy?.email || 'Unknown',
        department: pr.department,
      },
    );

    // Delete the purchase request
    await this.purchaseRequestRepo.delete(prId);
  }
}
