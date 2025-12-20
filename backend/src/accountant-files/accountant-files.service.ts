import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountantFile } from './accountant-file.entity';
import { Role } from '../users/roles.enum';
import * as crypto from 'crypto';

// Local minimal uploaded file interface to avoid type coupling
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Accountant Files Service
 * 
 * Business logic for handling accountant file uploads and retrieval.
 * Provides file validation, storage, and retrieval functionality.
 * 
 * For FYP: This service demonstrates separation of business logic from
 * HTTP handling, making the code more testable and maintainable.
 */
@Injectable()
export class AccountantFilesService {
  constructor(
    @InjectRepository(AccountantFile)
    private readonly repo: Repository<AccountantFile>,
  ) {}

  /**
   * Validate user role for file operations
   * 
   * @param role - User role to check
   * @throws ForbiddenException if user doesn't have required permissions
   */
  validateRole(role: Role) {
    if (!(role === Role.ACCOUNTANT || role === Role.SUPER_ADMIN)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  /**
   * Validate uploaded file type and size
   * 
   * Allowed file types:
   * - PDF documents
   * - Excel spreadsheets (.xlsx, .xls)
   * - Word documents (.docx, .doc)
   * - Plain text files (.txt)
   * - CSV files (.csv)
   * 
   * Maximum file size: 10MB
   * 
   * @param file - Uploaded file object
   * @throws BadRequestException if file is invalid, wrong type, or too large
   */
  validateFile(file: UploadedFile) {
    if (!file) throw new BadRequestException('No file uploaded');
    
    // Define allowed MIME types for file uploads
    // For FYP: This whitelist approach is more secure than blacklisting
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain',
      'text/csv', // .csv
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    // Check if file is a .txt file (some browsers send as octet-stream)
    const isTxtByName = file.originalname?.toLowerCase().endsWith('.txt');
    const isAllowedMime = allowed.includes(file.mimetype);
    const isOctetTxt = file.mimetype === 'application/octet-stream' && isTxtByName;

    // Validate MIME type
    if (!(isAllowedMime || isOctetTxt)) {
      throw new BadRequestException(
        'Unsupported file type. Allowed types: PDF, Excel, Word, Plain text, CSV'
      );
    }
    
    // Validate file size
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Generate SHA256 hash from file buffer
   * 
   * Creates a cryptographic hash of the file content for duplicate detection.
   * SHA256 provides strong collision resistance - the probability of two different
   * files producing the same hash is astronomically small (2^-256).
   * 
   * For FYP: This demonstrates using cryptographic hashing for content-based
   * file identification and deduplication.
   * 
   * @param buffer - File content as Buffer
   * @returns SHA256 hash as hexadecimal string (64 characters)
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if a file with the same content already exists
   * 
   * Looks up the database by file hash to detect duplicate uploads.
   * This prevents storing the same file multiple times, saving storage space
   * and preventing user confusion from duplicate files.
   * 
   * For FYP: This demonstrates database optimization through deduplication
   * and efficient lookups using indexed hash columns.
   * 
   * @param hash - SHA256 hash of the file
   * @returns Promise<AccountantFile | null> - Existing file or null if unique
   */
  async findByHash(hash: string): Promise<AccountantFile | null> {
    return this.repo.findOne({ 
      where: { file_hash: hash },
      select: ['id', 'filename', 'created_at', 'uploaded_by_id'],
    });
  }

  /**
   * Create and save a new file record to the database
   * 
   * Stores the complete file (metadata + binary content) in PostgreSQL.
   * For FYP prototype, files are stored in DB for simplicity.
   * In production, consider using cloud storage (S3, Azure Blob) for scalability.
   * 
   * @param file - Validated and scanned file object
   * @param userId - Optional user ID of the uploader
   * @returns Promise<AccountantFile> - Saved file entity with generated ID
   */
  async create(file: UploadedFile, userId?: string) {
    // Generate SHA256 hash of the file content
    const fileHash = this.generateFileHash(file.buffer);

    // Check for duplicate file based on hash
    const duplicate = await this.findByHash(fileHash);
    if (duplicate) {
      throw new BadRequestException(
        `This file already exists in the system (uploaded as "${duplicate.filename}" on ${duplicate.created_at.toISOString().split('T')[0]}). Duplicate uploads are not allowed.`
      );
    }

    const entity = this.repo.create({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      file_hash: fileHash, // Store hash for future duplicate detection
      uploaded_by_id: userId || null, // Track who uploaded (null allowed for prototype)
    });
    return this.repo.save(entity);
  }

  /**
   * List all files with metadata only (excludes binary data)
   * 
   * Returns files sorted by creation date (newest first)
   * Binary data is excluded for performance - only metadata is returned
   * 
   * @returns Promise<AccountantFile[]> - Array of file metadata
   */
  list() {
    // Include uploader relation so frontend can show who uploaded the file
    // Note: When using select with relations, we need to use QueryBuilder
    // to properly select both entity and relation fields
    return this.repo
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploaded_by', 'user')
      .select([
        'file.id',
        'file.filename',
        'file.mimetype',
        'file.size',
        'file.created_at',
        'file.uploaded_by_id',
        'user.id',
        'user.email'
      ])
      .orderBy('file.created_at', 'DESC')
      .getMany();
  }

  /**
   * Retrieve a specific file by ID (including binary data)
   * 
   * @param id - File UUID
   * @returns Promise<AccountantFile> - Complete file entity with binary data
   * @throws BadRequestException if file not found
   */
  async getFile(id: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new BadRequestException('File not found');
    return f;
  }

  /**
   * Delete a file by ID
   * 
   * Removes a file from the database. Includes permission checks to ensure
   * users can only delete their own files (unless they are super admin).
   * 
   * For FYP: This demonstrates proper authorization logic where users have
   * different levels of access - regular users can only delete their own files,
   * while super admins have unrestricted access.
   * 
   * @param id - File UUID to delete
   * @param userId - ID of the user attempting to delete
   * @param userRole - Role of the user attempting to delete
   * @throws NotFoundException if file doesn't exist
   * @throws ForbiddenException if user doesn't have permission to delete
   */
  async deleteFile(id: string, userId?: string, userRole?: Role): Promise<void> {
    // Step 1: Find the file
    const file = await this.repo.findOne({ 
      where: { id },
      select: ['id', 'filename', 'uploaded_by_id'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Step 2: Check permissions
    // Super admins can delete any file
    // Regular accountants can only delete their own files
    const isSuperAdmin = userRole === Role.SUPER_ADMIN;
    const isOwner = file.uploaded_by_id === userId;

    if (!isSuperAdmin && !isOwner) {
      throw new ForbiddenException(
        'You can only delete files you uploaded. Contact a super admin to delete other files.'
      );
    }

    // Step 3: Delete the file
    await this.repo.delete(id);
  }
}
