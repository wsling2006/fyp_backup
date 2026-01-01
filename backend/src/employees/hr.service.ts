import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Employee } from './employee.entity';
import { EmployeeDocument } from './employee-document.entity';
import { AuditLog } from '../audit/audit-log.entity';
import * as crypto from 'crypto';

// Minimal uploaded file interface
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * HR Service
 * 
 * Business logic for HR operations:
 * - Employee list (minimal data)
 * - Employee detail (full sensitive data)
 * - Employee document upload/download
 * - Smart audit log throttling
 * 
 * Security:
 * - Reuses existing file upload patterns (accountant-files, claims)
 * - All sensitive data access should be audit logged
 * - Role-based access enforced at controller level
 */
@Injectable()
export class HRService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeDocument)
    private readonly documentRepo: Repository<EmployeeDocument>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Check if employee view should be logged
   * Returns true only if:
   * - No view log exists for this user + employee today
   * - This prevents spam from page refreshes
   * 
   * Smart throttling: Only log once per user per employee per day
   * 
   * @param userId - User who is viewing
   * @param employeeId - Employee being viewed
   * @returns Promise<boolean> - True if should log, false if already logged today
   */
  async shouldLogEmployeeView(userId: string, employeeId: string): Promise<boolean> {
    // Get start of today (00:00:00) in local timezone
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Check if a VIEW_EMPLOYEE_PROFILE log exists for this user + employee today
    const existingLog = await this.auditRepo.findOne({
      where: {
        user_id: userId,
        action: 'VIEW_EMPLOYEE_PROFILE',
        resource: 'employee',
        resource_id: employeeId,
        created_at: MoreThanOrEqual(startOfToday),
      },
      order: { created_at: 'DESC' },
    });

    // If no log found, should log (first view today)
    // If log found, should NOT log (already logged today)
    return !existingLog;
  }

  /**
   * Get employee list with minimal data
   * Only returns: employee_id, name, status
   * 
   * @returns Promise<Employee[]> - Array of employees with public fields only
   */
  async getEmployeeList(): Promise<Partial<Employee>[]> {
    const employees = await this.employeeRepo.find({
      select: ['id', 'employee_id', 'name', 'status'],
      order: { name: 'ASC' },
    });
    return employees;
  }

  /**
   * Get employee by ID with ALL sensitive data
   * This should be audit logged when called
   * 
   * @param id - Employee UUID
   * @returns Promise<Employee> - Full employee record
   * @throws NotFoundException if employee not found
   */
  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  /**
   * Search employees by name or employee_id
   * Returns minimal data only
   * 
   * @param query - Search query string
   * @returns Promise<Employee[]> - Matching employees
   */
  async searchEmployees(query: string): Promise<Partial<Employee>[]> {
    const employees = await this.employeeRepo
      .createQueryBuilder('employee')
      .select(['employee.id', 'employee.employee_id', 'employee.name', 'employee.status'])
      .where('employee.name ILIKE :query', { query: `%${query}%` })
      .orWhere('employee.employee_id ILIKE :query', { query: `%${query}%` })
      .orderBy('employee.name', 'ASC')
      .getMany();

    return employees;
  }

  /**
   * Update employee information
   * 
   * @param id - Employee UUID
   * @param updateData - Fields to update
   * @returns Promise<Employee> - Updated employee record
   * @throws NotFoundException if employee not found
   */
  async updateEmployee(
    id: string,
    updateData: Partial<Employee>,
  ): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Update only provided fields
    Object.assign(employee, updateData);

    // Save and return updated employee
    return await this.employeeRepo.save(employee);
  }

  /**
   * Validate uploaded file
   * Reuses validation logic from accountant-files
   * 
   * Allowed types: PDF, Word, Excel, Images, Text
   * Max size: 10MB
   */
  validateFile(file: UploadedFile): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ONLY ALLOW PDF for employee documents (resume, agreement, etc.)
    const allowedMimeTypes = [
      'application/pdf',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF files are allowed for employee documents (resume, employment agreement, etc.).'
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds limit. Maximum allowed: ${maxSize / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Generate SHA256 hash from file buffer
   * Reuses pattern from accountant-files and claims
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for duplicate file by hash
   */
  async findDocumentByHash(hash: string): Promise<EmployeeDocument | null> {
    return this.documentRepo.findOne({
      where: { file_hash: hash },
      select: ['id', 'filename', 'created_at', 'employee_id'],
    });
  }

  /**
   * Upload employee document
   * Reuses file upload pattern from accountant-files
   * 
   * @param employeeId - Employee UUID
   * @param file - Validated and scanned file
   * @param documentType - Type of document
   * @param description - Optional description
   * @param uploadedBy - User ID of uploader
   * @returns Promise<EmployeeDocument> - Saved document
   */
  async uploadDocument(
    employeeId: string,
    file: UploadedFile,
    documentType: string,
    description: string | null,
    uploadedBy: string,
  ): Promise<EmployeeDocument> {
    // Verify employee exists
    const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Generate file hash
    const fileHash = this.generateFileHash(file.buffer);

    // Check for duplicates
    const duplicate = await this.findDocumentByHash(fileHash);
    if (duplicate) {
      throw new BadRequestException(
        `This file has already been uploaded on ${duplicate.created_at.toISOString()}`
      );
    }

    // Create document record
    const document = this.documentRepo.create({
      employee_id: employeeId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      file_hash: fileHash,
      document_type: documentType as any,
      description,
      uploaded_by_id: uploadedBy,
    });

    return this.documentRepo.save(document);
  }

  /**
   * Get all documents for an employee
   * Returns metadata only (no file data for performance)
   * 
   * @param employeeId - Employee UUID
   * @returns Promise<EmployeeDocument[]> - Array of documents
   */
  async getEmployeeDocuments(employeeId: string): Promise<Partial<EmployeeDocument>[]> {
    const documents = await this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploaded_by', 'uploader')
      .select([
        'doc.id',
        'doc.filename',
        'doc.mimetype',
        'doc.size',
        'doc.document_type',
        'doc.description',
        'doc.created_at',
        'uploader.id',
        'uploader.email',
      ])
      .where('doc.employee_id = :employeeId', { employeeId })
      .orderBy('doc.created_at', 'DESC')
      .getMany();

    return documents;
  }

  /**
   * Get document by ID with full data (for download)
   * 
   * @param documentId - Document UUID
   * @returns Promise<EmployeeDocument> - Full document with binary data
   * @throws NotFoundException if document not found
   */
  async getDocumentById(documentId: string): Promise<EmployeeDocument> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Delete employee document
   * 
   * @param documentId - Document UUID
   * @throws NotFoundException if document not found
   */
  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.documentRepo.remove(document);
  }

  /**
   * Create audit log entry
   * Helper method to standardize audit logging
   * 
   * @param auditData - Audit log data
   * @returns Promise<AuditLog> - Created audit log
   */
  async createAuditLog(auditData: {
    performedBy: string;
    action: string;
    targetUserId?: string;
    details?: string;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const auditLog = this.auditRepo.create({
      user_id: auditData.performedBy,
      action: auditData.action,
      resource: 'employee',
      resource_id: auditData.targetUserId,
      user_agent: auditData.details, // Store details in user_agent field
      ip_address: auditData.ipAddress,
    });

    return this.auditRepo.save(auditLog);
  }

  /**
   * Create employee
   * 
   * @param employeeData - Employee information
   * @returns Promise<Employee> - Created employee
   */
  async createEmployee(employeeData: any): Promise<Employee> {
    // Generate employee_id (e.g., EMP001, EMP002...)
    const lastEmployee = await this.employeeRepo.find({
      order: { created_at: 'DESC' },
      take: 1,
    });

    let nextNumber = 1;
    if (lastEmployee.length > 0 && lastEmployee[0].employee_id) {
      const match = lastEmployee[0].employee_id.match(/EMP(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const employee_id = `EMP${nextNumber.toString().padStart(3, '0')}`;

    // Parse dates safely
    const birthday = employeeData.birthday ? new Date(employeeData.birthday) : undefined;
    const dateOfJoining = employeeData.date_of_joining ? new Date(employeeData.date_of_joining) : new Date();

    // Create employee entity
    const employee = this.employeeRepo.create({
      employee_id,
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      address: employeeData.address,
      emergency_contact: employeeData.emergency_contact,
      ic_number: employeeData.ic_number,
      birthday,
      bank_account_number: employeeData.bank_account_number,
      position: employeeData.position,
      department: employeeData.department,
      date_of_joining: dateOfJoining,
      status: employeeData.status || 'ACTIVE',
      is_active: true,
    });

    // Save to database
    const savedEmployee = await this.employeeRepo.save(employee);
    return savedEmployee;
  }
}
