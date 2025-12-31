import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Res,
  NotFoundException,
  ForbiddenException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { MfaSessionGuard } from '../auth/mfa-session.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { PurchaseRequestService } from '../purchase-requests/purchase-request.service';
import { AuditService } from '../audit/audit.service';
import { ClaimStatus, MalwareScanStatus } from '../purchase-requests/claim.entity';

/**
 * Secure Accountant API Controller
 * 
 * This controller provides secure endpoints for accountants to access
 * sensitive claim data and receipts with strict security controls:
 * 
 * Security Features:
 * - JWT Authentication required
 * - Role-based access (Accountant or SuperAdmin only)
 * - MFA session verification required
 * - State validation (claim must be in valid state)
 * - Malware scan validation (file must be CLEAN)
 * - Comprehensive audit logging
 * - Zero-trust file streaming (no path exposure)
 * - Memory-safe file streaming (no full file in memory)
 * 
 * @controller /api/accountant
 */
@Controller('api/accountant')
@UseGuards(JwtAuthGuard, RolesGuard, MfaSessionGuard)
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
export class SecureAccountantController {
  constructor(
    private purchaseRequestService: PurchaseRequestService,
    private auditService: AuditService,
  ) {}

  /**
   * Download Claim Receipt (Secure)
   * 
   * Allows accountants to securely download receipt files with full security validation.
   * 
   * Security Checks (in order):
   * 1. JWT Authentication (via JwtAuthGuard)
   * 2. Role verification (Accountant or SuperAdmin only)
   * 3. MFA session verification (must have logged in with MFA)
   * 4. Claim existence check
   * 5. Claim state validation (VERIFIED, PROCESSED, or REJECTED only)
   * 6. Malware scan validation (must be CLEAN)
   * 7. File existence check
   * 8. Audit logging
   * 9. Memory-safe streaming
   * 
   * @param claimId - UUID of the claim
   * @param req - Express request (contains authenticated user)
   * @param res - Express response (for streaming)
   * @returns File stream with proper headers
   * 
   * @throws {NotFoundException} - If claim or file not found
   * @throws {ForbiddenException} - If security checks fail
   * 
   * @example
   * GET /api/accountant/claims/123e4567-e89b-12d3-a456-426614174000/receipt
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * Content-Type: application/octet-stream
   * Content-Disposition: attachment; filename="receipt.pdf"
   * [Binary file stream]
   */
  @Get('claims/:claimId/receipt')
  async downloadClaimReceipt(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // Step 1: Get claim (basic validation done by service)
      const claim = await this.purchaseRequestService.getClaimByIdForAccountant(claimId);

      if (!claim) {
        throw new NotFoundException('Claim not found');
      }

      // Step 2: Validate claim state
      // Only allow download if claim has been verified, processed, or rejected
      const allowedStates = [ClaimStatus.VERIFIED, ClaimStatus.PROCESSED, ClaimStatus.REJECTED];
      
      if (!allowedStates.includes(claim.status)) {
        throw new ForbiddenException(
          `Receipt download not allowed for claims in ${claim.status} state. ` +
          `Claim must be VERIFIED, PROCESSED, or REJECTED.`,
        );
      }

      // Step 3: Validate malware scan status
      if (claim.malware_scan_status !== MalwareScanStatus.CLEAN) {
        throw new ForbiddenException(
          'Receipt file has not passed malware scanning. Download blocked for security reasons.',
        );
      }

      // Step 4: Check if file exists
      const filePath = claim.receipt_file_path;
      
      try {
        await stat(filePath);
      } catch (error) {
        throw new NotFoundException('Receipt file not found on server');
      }

      // Step 5: Log download action (before streaming)
      await this.auditService.logFromRequest(
        req,
        userId,
        'ACCOUNTANT_DOWNLOADED_RECEIPT',
        'claim',
        claimId,
        {
          filename: claim.receipt_file_original_name,
          amount_claimed: claim.amount_claimed,
          vendor: claim.vendor_name,
          claim_status: claim.status,
          ip_address: ipAddress,
        },
      );

      // Step 6: Set security headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(claim.receipt_file_original_name)}"`,
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      // Step 7: Stream file (memory-safe, no full file in memory)
      const fileStream = createReadStream(filePath);
      
      // Handle stream errors
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            message: 'Error streaming file',
          });
        }
      });

      // Pipe file stream to response
      fileStream.pipe(res);

    } catch (error) {
      // Log failed attempt
      await this.auditService.logFromRequest(
        req,
        userId,
        'ACCOUNTANT_DOWNLOAD_FAILED',
        'claim',
        claimId,
        {
          error: error.message,
          ip_address: ipAddress,
        },
      );

      throw error;
    }
  }
}
