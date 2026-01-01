import {
  Controller,
  Get,
  Post,
  Put,
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
  
  // Track viewed employees per user session to prevent spam
  // Format: Map<userId, Set<employeeId>>
  private readonly viewedEmployees = new Map<string, Set<string>>();

  constructor(
    private readonly hrService: HRService,
    private readonly clamavService: ClamavService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get employee list with minimal data
   * Returns: employee_id, name, status only
   * 
   * ⚠️ NOT AUDIT LOGGED - This is just a list view with minimal data
   * Only viewing individual profiles is audit logged (sensitive data access)
   * 
   * @returns Object with employees array
   */
  @Get('employees')
  async getEmployeeList(@Req() req: any) {
    try {
      const employees = await this.hrService.getEmployeeList();

      // No audit logging - just a list view with minimal data (employee_id, name, status)
      // Only individual profile access is logged (contains IC, bank account, etc.)

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
   * ⚠️ NOT AUDIT LOGGED - Just a search/filter operation
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

    // No audit logging - just a search/filter, not viewing sensitive data

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
   * Action: VIEW_EMPLOYEE_PROFILE (counts as VIEW action in audit dashboard)
   * 
   * Anti-Spam Feature (Server-Side Tracking):
   * - Tracks viewed employees per user in-memory on backend
   * - First view of an employee → Creates audit log
   * - Subsequent views (refreshes) → Skips audit log
   * - More reliable than client-side sessionStorage
   * - Resets when backend restarts (expected behavior)
   * 
   * @param id - Employee UUID
   * @param req - Request object with user info
   * @returns Full employee object
   */
  @Get('employees/:id')
  async getEmployeeById(
    @Param('id') id: string, 
    @Query('silent') silent: string,
    @Req() req: any
  ) {
    const employee = await this.hrService.getEmployeeById(id);
    const userId = req.user.userId;

    // Check if this user has already viewed this employee
    if (!this.viewedEmployees.has(userId)) {
      this.viewedEmployees.set(userId, new Set());
    }
    
    const userViewedEmployees = this.viewedEmployees.get(userId)!;
    const hasViewedBefore = userViewedEmployees.has(id);

    // Only log if:
    // 1. User hasn't viewed this employee before (first view)
    // 2. AND silent parameter is not explicitly set to 'true'
    const isSilent = silent === 'true';
    const shouldLog = !hasViewedBefore && !isSilent;

    // DEBUG LOGGING - Remove after testing
    this.logger.debug(`[AUDIT SPAM DEBUG] userId=${userId}, employeeId=${id}, hasViewedBefore=${hasViewedBefore}, isSilent=${isSilent}, shouldLog=${shouldLog}`);
    this.logger.debug(`[AUDIT SPAM DEBUG] Total users tracked: ${this.viewedEmployees.size}, This user viewed: ${userViewedEmployees.size} employees`);

    if (shouldLog) {
      this.logger.log(`Creating audit log for VIEW_EMPLOYEE_PROFILE - First time user ${userId} viewed employee ${id}`);
      await this.auditService.logFromRequest(
        req,
        userId,
        'VIEW_EMPLOYEE_PROFILE',
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
      
      // Mark this employee as viewed by this user
      userViewedEmployees.add(id);
      this.logger.debug(`[AUDIT SPAM DEBUG] Added employee ${id} to user ${userId}'s viewed list. Now tracking ${userViewedEmployees.size} employees for this user.`);
    } else {
      this.logger.log(`Skipping audit log for VIEW_EMPLOYEE_PROFILE - User ${userId} already viewed employee ${id} (hasViewedBefore=${hasViewedBefore}) or silent mode (isSilent=${isSilent})`);
    }

    return { employee };
  }

  /**
   * Get employee documents list
   * Returns metadata only (no file data)
   * 
   * ⚠️ NOT AUDIT LOGGED - This is just metadata (filename, type, size)
   * Actual document downloads are audit logged (file content access)
   * 
   * @param id - Employee UUID
   * @returns Object with documents array
   */
  @Get('employees/:id/documents')
  async getEmployeeDocuments(@Param('id') id: string, @Req() req: any) {
    const documents = await this.hrService.getEmployeeDocuments(id);

    // No audit logging - just metadata view
    // Document downloads are logged (actual sensitive data access)

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
    const validTypes = [
      'RESUME',
      'EMPLOYMENT_AGREEMENT',
      'EMPLOYMENT_CONTRACT',
      'OFFER_LETTER',
      'IDENTITY_DOCUMENT',
      'CERTIFICATION',
      'PERFORMANCE_REVIEW',
      'OTHER'
    ];
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

      // NO AUDIT LOGGING - Document uploads are operational, not sensitive data access

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

      // NO AUDIT LOGGING - Document downloads are operational

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

    // NO AUDIT LOGGING - Document deletions are operational

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Create new employee
   * Requires all employee information
   * 
   * ⚠️ NOT AUDIT LOGGED - Employee creation is operational
   * Only viewing employee profiles (sensitive data) is audit logged
   * 
   * @body employee data
   * @returns Created employee object
   */
  @Post('employees')
  async createEmployee(@Body() employeeData: any, @Req() req: any) {
    try {
      // Validate required fields
      if (!employeeData.name || !employeeData.email) {
        throw new BadRequestException('Name and email are required');
      }

      // Create employee
      const employee = await this.hrService.createEmployee(employeeData);

      // NO AUDIT LOGGING - Only profile views are logged

      this.logger.log(`Employee created: ${employee.employee_id} by user ${req.user.userId}`);

      return {
        success: true,
        message: 'Employee created successfully',
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          status: employee.status,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create employee: ${error.message}`);
      throw new InternalServerErrorException(error.message || 'Failed to create employee');
    }
  }

  /**
   * Update employee information
   * 
   * ✅ AUDIT LOGGED - Updating employee data is a sensitive operation
   * Logs what fields were changed and their old/new values
   * 
   * @param id - Employee UUID
   * @param updateData - Fields to update
   * @returns Updated employee object
   */
  @Put('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      emergency_contact?: string;
      ic_number?: string;
      birthday?: string;
      bank_account_number?: string;
      position?: string;
      department?: string;
      date_of_joining?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
    },
    @Req() req: any,
  ) {
    // Get original employee data before update
    const originalEmployee = await this.hrService.getEmployeeById(id);

    // Convert date strings to Date objects if provided
    const processedData: any = { ...updateData };
    if (updateData.birthday) {
      processedData.birthday = new Date(updateData.birthday);
    }
    if (updateData.date_of_joining) {
      processedData.date_of_joining = new Date(updateData.date_of_joining);
    }

    // Update employee
    const updatedEmployee = await this.hrService.updateEmployee(id, processedData);

    // Track what fields changed
    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    for (const [key, newValue] of Object.entries(updateData)) {
      if (newValue !== undefined && originalEmployee[key] !== newValue) {
        changedFields.push(key);
        oldValues[key] = originalEmployee[key];
        newValues[key] = newValue;
      }
    }

    // ⚠️ CRITICAL: Log the update action
    await this.auditService.logFromRequest(
      req,
      req.user.userId,
      'UPDATE_EMPLOYEE',
      'employee',
      id,
      {
        employee_id: originalEmployee.employee_id,
        name: originalEmployee.name,
        changed_fields: changedFields,
        old_values: oldValues,
        new_values: newValues,
      },
    );

    return { 
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee 
    };
  }

  /**/}
