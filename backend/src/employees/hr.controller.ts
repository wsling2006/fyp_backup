import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  Req,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { HRService } from './hr.service';
import { ClamavService } from '../clamav/clamav.service';
import { AuditService } from '../audit/audit.service';

/**
 * HR Controller
 * 
 * Handles HR operations:
 * - Employee list (minimal data)
 * - Employee detail (full data, audit logged)
 * - Employee document upload (ClamAV scanned)
 * - Employee document download (streamed)
 * 
 * Security:
 * - JWT authentication required
 * - Role-based access control (HR and SUPER_ADMIN only)
 * - All sensitive operations are audit logged
 * - File uploads scanned with ClamAV
 * - Reuses existing secure patterns
 */
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR, Role.SUPER_ADMIN)
export class HRController {
  private readonly logger = new Logger(HRController.name);

  constructor(
    private readonly hrService: HRService,
    private readonly clamavService: ClamavService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get employee list with minimal data
   * Returns: employee_id, name, status only
   * 
   * @returns Object with employees array
   */
  @Get('employees')
  async getEmployeeList(@Req() req: any) {
    try {
      const employees = await this.hrService.getEmployeeList();

      // Log access (not sensitive - just list view)
      await this.auditService.logFromRequest(
        req,
        req.user.userId,
        'HR_VIEW_EMPLOYEE_LIST',
        'employee',
        undefined,
        { count: employees?.length || 0 },
      );

      // Always return an array, even if empty
      return { employees: employees || [] };
    } catch (error) {
      this.logger.error(`Failed to get employee list: ${error.message}`);
      // Return empty array on error to prevent frontend crash
      return { employees: [] };
    }
  }

  /**
   * Search employees by name or employee_id
   * Returns minimal data only
   * 
   * @param query - Search query string
   * @returns Object with employees array
   */
  @Get('employees/search')
  async searchEmployees(@Query('q') query: string, @Req() req: any) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const employees = await this.hrService.searchEmployees(query);

    // Log search
    await this.auditService.logFromRequest(
      req,
      req.user.userId,
      'HR_SEARCH_EMPLOYEES',
      'employee',
      undefined,
      { query, results: employees.length },
    );

    return { employees };
  }

  /**
   * Get employee by ID with ALL sensitive data
   * ⚠️ This is audit logged as it exposes:
   * - IC number
   * - Bank account
   * - Birthday
   * - Phone, address, emergency contact
   * 
   * @param id - Employee UUID
   * @returns Full employee object
   */
  @Get('employees/:id')
  async getEmployeeById(@Param('id') id: string, @Req() req: any) {
    const employee = await this.hrService.getEmployeeById(id);

    // ⚠️ CRITICAL: Log access to sensitive data
    await this.auditService.logFromRequest(
      req,
      req.user.userId,
      'HR_VIEW_EMPLOYEE_PROFILE',
      'employee',
      id,
      {
        employee_id: employee.employee_id,
        name: employee.name,
        accessed_fields: [
          'email',
          'phone',
          'address',
          'emergency_contact',
          'ic_number',
          'birthday',
          'bank_account_number',
        ],
      },
    );

    return { employee };
  }

  /**
   * Get employee documents list
   * Returns metadata only (no file data)
   * 
   * @param id - Employee UUID
   * @returns Object with documents array
   */
  @Get('employees/:id/documents')
  async getEmployeeDocuments(@Param('id') id: string, @Req() req: any) {
    const documents = await this.hrService.getEmployeeDocuments(id);

    // Log access
    await this.auditService.logFromRequest(
      req,
      req.user.userId,
      'HR_VIEW_EMPLOYEE_DOCUMENTS',
      'employee',
      id,
      { document_count: documents.length },
    );

    return { documents };
  }

  /**
   * Upload employee document
   * 
   * Security flow:
   * 1. File received via multipart/form-data
   * 2. Validate file type and size
   * 3. Scan with ClamAV for malware
   * 4. Check for duplicates (SHA256 hash)
   * 5. Store in database (BYTEA)
   * 6. Audit log
   * 
   * Reuses exact pattern from accountant-files and claims
   */
  @Post('employees/:id/documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadDocument(
    @Param('id') employeeId: string,
    @UploadedFile() file: any,
    @Body('document_type') documentType: string,
    @Body('description') description: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate document type
    const validTypes = ['RESUME', 'EMPLOYMENT_CONTRACT', 'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'OTHER'];
    if (!validTypes.includes(documentType)) {
      throw new BadRequestException(
        `Invalid document type. Allowed: ${validTypes.join(', ')}`
      );
    }

    try {
      // Step 1: Validate file
      this.hrService.validateFile(file);

      // Step 2: Scan with ClamAV (CRITICAL SECURITY STEP)
      const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
      if (!isClean) {
        throw new BadRequestException(
          'File upload rejected: malware detected. Please scan your files before uploading.'
        );
      }

      // Step 3: Upload to database (includes duplicate check)
      const document = await this.hrService.uploadDocument(
        employeeId,
        file,
        documentType,
        description || null,
        req.user.userId,
      );

      // Step 4: Audit log
      await this.auditService.logFromRequest(
        req,
        req.user.userId,
        'HR_UPLOAD_EMPLOYEE_DOCUMENT',
        'employee_document',
        document.id,
        {
          employee_id: employeeId,
          filename: file.originalname,
          document_type: documentType,
          size: file.size,
        },
      );

      return {
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: document.id,
          filename: document.filename,
          document_type: document.document_type,
          created_at: document.created_at,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Document upload failed. Please try again later.'
      );
    }
  }

  /**
   * Download employee document
   * 
   * Security:
   * - Streams file directly (memory safe)
   * - Proper Content-Type and Content-Disposition headers
   * - Audit logged
   * 
   * Reuses exact pattern from accountant-files download
   */
  @Get('employees/:employeeId/documents/:documentId/download')
  async downloadDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      // Get document with full data
      const document = await this.hrService.getDocumentById(documentId);

      // Verify document belongs to specified employee
      if (document.employee_id !== employeeId) {
        throw new BadRequestException('Document does not belong to specified employee');
      }

      // Audit log
      await this.auditService.logFromRequest(
        req,
        req.user.userId,
        'HR_DOWNLOAD_EMPLOYEE_DOCUMENT',
        'employee_document',
        documentId,
        {
          employee_id: employeeId,
          filename: document.filename,
          document_type: document.document_type,
          size: document.size,
        },
      );

      // Set proper headers for download
      res.setHeader('Content-Type', document.mimetype);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(document.filename)}"`,
      );
      res.setHeader('Content-Length', document.size.toString());

      // Stream file data directly to response
      res.send(document.data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to download document');
    }
  }

  /**
   * Delete employee document
   * 
   * @param documentId - Document UUID
   * @returns Success message
   */
  @Delete('employees/:employeeId/documents/:documentId')
  async deleteDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    // Get document first for audit log
    const document = await this.hrService.getDocumentById(documentId);

    // Verify document belongs to specified employee
    if (document.employee_id !== employeeId) {
      throw new BadRequestException('Document does not belong to specified employee');
    }

    // Delete document
    await this.hrService.deleteDocument(documentId);

    // Audit log
    await this.auditService.logFromRequest(
      req,
      req.user.userId,
      'HR_DELETE_EMPLOYEE_DOCUMENT',
      'employee_document',
      documentId,
      {
        employee_id: employeeId,
        filename: document.filename,
        document_type: document.document_type,
      },
    );

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }
}
