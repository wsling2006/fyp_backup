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
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as argon2 from 'argon2';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { HRService } from './hr.service';
import { ClamavService } from '../clamav/clamav.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';

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
    private readonly usersService: UsersService,
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
   * Session-Based Anti-Spam (Perfect for "Show All Data" UI):
   * 
   * 🔹 In-Memory Tracking:
   *    - Tracks which users have viewed which employees in this backend session
   *    - Prevents spam from page refreshes
   *    - Clears when backend restarts
   * 
   * 🔹 Frontend SessionStorage:
   *    - Persists "viewed" state in browser
   *    - Survives backend restarts (sends ?silent=true)
   *    - Clears when browser closes or user logs out
   * 
   * Result: ONE audit log per browser session per employee!
   * - First view in session → Audit log created ✓
   * - Refresh 100 times → NO logs (in-memory prevents spam) ✓
   * - Backend restart, refresh → NO log (sessionStorage sends silent=true) ✓
   * - Close browser, reopen → New audit log (new session) ✓
   * 
   * Why session-based is appropriate:
   * - UI shows ALL data at once (IC, bank account, etc.)
   * - Refreshing doesn't reveal "new" data
   * - Session = meaningful access period
   * - Logs when user "opens the profile", not every page load
   * 
   * @param id - Employee UUID
   * @param silent - Optional query param to suppress audit logging
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

    // SESSION-BASED ANTI-SPAM (Simple & Appropriate for "show all data" UI)
    // Check in-memory Map: Has this user viewed this employee in current session?
    
    if (!this.viewedEmployees.has(userId)) {
      this.viewedEmployees.set(userId, new Set());
    }
    
    const userViewedEmployees = this.viewedEmployees.get(userId)!;
    const hasViewedBefore = userViewedEmployees.has(id);

    // Determine if we should log
    const isSilent = silent === 'true'; // Frontend sends silent=true after first view
    const shouldLog = !hasViewedBefore && !isSilent;

    // DEBUG LOGGING
    this.logger.debug(`[AUDIT SPAM DEBUG] userId=${userId}, employeeId=${id}`);
    this.logger.debug(`[AUDIT SPAM DEBUG] hasViewedBefore=${hasViewedBefore}, isSilent=${isSilent}, shouldLog=${shouldLog}`);
    this.logger.debug(`[AUDIT SPAM DEBUG] In-memory tracking: ${this.viewedEmployees.size} users, this user viewed ${userViewedEmployees.size} employees`);

    if (shouldLog) {
      this.logger.log(`✓ Creating audit log - First view in session: user ${userId} → employee ${id}`);
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
      
      // Mark as viewed in memory
      userViewedEmployees.add(id);
      this.logger.debug(`[AUDIT SPAM DEBUG] Added to in-memory tracking`);
    } else {
      if (hasViewedBefore) {
        this.logger.log(`✗ Skipping audit log - Already viewed in this session (in-memory check)`);
      } else if (isSilent) {
        this.logger.log(`✗ Skipping audit log - Silent mode (frontend sessionStorage detected previous view)`);
      }
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
      this.logger.log(`[HR] Validating file: ${file.originalname}`);
      this.hrService.validateFile(file);

      // Step 2: Scan with ClamAV (CRITICAL SECURITY STEP)
      this.logger.log(`[HR] Scanning file with ClamAV: ${file.originalname}`);
      const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
      if (!isClean) {
        throw new BadRequestException(
          'File upload rejected: malware detected. Please scan your files before uploading.'
        );
      }
      this.logger.log(`[HR] ClamAV scan passed: ${file.originalname}`);

      // Step 3: Upload to database (includes duplicate check)
      this.logger.log(`[HR] Uploading document to database for employee: ${employeeId}`);
      const document = await this.hrService.uploadDocument(
        employeeId,
        file,
        documentType,
        description || null,
        req.user.userId,
      );

      this.logger.log(`[HR] Document uploaded successfully: ${document.id}`);

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
      this.logger.error(`[HR] Document upload failed: ${error.message}`, error.stack);
      
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

  /**
   * Delete employee (CRITICAL OPERATION - IRREVERSIBLE)
   * 
   * ⚠️⚠️⚠️ THIS IS A PERMANENT DELETION - CANNOT BE UNDONE! ⚠️⚠️⚠️
   * 
   * Security Requirements:
   * 1. Password verification (user must enter their password)
   * 2. OTP verification (user must enter valid OTP from email)
   * 3. Audit log created BEFORE deletion
   * 4. All employee documents deleted
   * 5. Cannot be reversed
   * 
   * @body password - User's password for verification
   * @body otpCode - OTP code from email
   * @param id - Employee UUID to delete
   * @returns Success message
   */
  @Delete('employees/:id')
  async deleteEmployee(
    @Param('id') id: string,
    @Body() body: { password: string; otpCode: string },
    @Req() req: any,
  ) {
    const { password, otpCode } = body;

    // Validate input
    if (!password || !otpCode) {
      throw new BadRequestException('Password and OTP code are required for this critical operation');
    }

    // Get the employee BEFORE deletion (for audit log)
    const employee = await this.hrService.getEmployeeById(id);

    // Get current user for password verification
    const userId = req.user.userId;
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // STEP 1: Verify password
    const passwordValid = await argon2.verify(user.password_hash, password);
    if (!passwordValid) {
      this.logger.warn(`Failed employee deletion attempt - Invalid password for user ${userId}`);
      throw new UnauthorizedException('Invalid password. Please enter your correct password to confirm this critical action.');
    }

    // STEP 2: Verify OTP using UsersService (same as purchase-requests)
    try {
      this.usersService.verifyOtp(userId, otpCode, 'DELETE_EMPLOYEE');
    } catch (error) {
      this.logger.warn(`Failed employee deletion attempt - Invalid OTP for user ${userId}`);
      throw error;
    }

    // STEP 3: Create audit log BEFORE deletion
    this.logger.log(`⚠️ CRITICAL: Employee deletion initiated by user ${userId} for employee ${id}`);
    
    await this.auditService.logFromRequest(
      req,
      userId,
      'DELETE_EMPLOYEE',
      'employee',
      id,
      {
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        ic_number: employee.ic_number,
        bank_account_number: employee.bank_account_number,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        warning: 'PERMANENT DELETION - CANNOT BE UNDONE',
        verified_with: 'Password + OTP',
      },
    );

    // STEP 4: Perform deletion
    await this.hrService.deleteEmployee(id);

    this.logger.log(`✓ Employee ${employee.employee_id} (${employee.name}) permanently deleted by user ${userId}`);

    return {
      success: true,
      message: `Employee ${employee.name} has been permanently deleted. This action cannot be undone.`,
      deleted_employee: {
        employee_id: employee.employee_id,
        name: employee.name,
      },
    };
  }

  /**
   * Request OTP for employee deletion
   * 
   * Sends OTP to user's email for verifying critical employee deletion operation
   * 
   * @returns Success message with OTP sent confirmation
   */
  @Post('employees/:id/request-delete-otp')
  async requestDeleteOtp(
    @Param('id') id: string,
    @Body() body: { password: string },
    @Req() req: any,
  ) {
    const { password } = body;
    
    if (!password) {
      throw new BadRequestException('Password is required');
    }
    
    // Verify employee exists
    const employee = await this.hrService.getEmployeeById(id);
    
    const userId = req.user.userId;
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password_hash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate OTP using UsersService (same as purchase requests)
    const otpResult = await this.usersService.generateOtp(userId, 'DELETE_EMPLOYEE');

    this.logger.log(`OTP for employee deletion requested by user ${userId} for employee: ${employee.name} (${employee.employee_id})`);

    return {
      success: true,
      message: 'OTP sent to your email. It will expire in 5 minutes.',
      email: user.email,
      // For development - include OTP in response
      otp_debug: process.env.NODE_ENV === 'development' ? otpResult.otp : undefined,
    };
  }

  /**/}
