import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Get, Res, Param, BadRequestException, InternalServerErrorException, Delete, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { AccountantFilesService } from './accountant-files.service';
import { ClamavService } from '../clamav/clamav.service';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

// Minimal UploadedFile type
interface UploadedFileLocal {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Request type with authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: Role;
  };
}

/**
 * Accountant Files Controller
 * 
 * Handles file upload, listing, and download operations for accountants.
 * Implements secure file handling with ClamAV malware scanning.
 * 
 * Security features:
 * - JWT authentication required
 * - Role-based access control (ACCOUNTANT or SUPER_ADMIN only)
 * - File type validation
 * - File size limits (10MB)
 * - Malware scanning with ClamAV
 * 
 * For FYP: This demonstrates a complete secure file upload implementation
 * with multiple layers of defense (authentication, authorization, validation, scanning)
 */
@Controller('accountant-files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
export class AccountantFilesController {
  constructor(
    private readonly service: AccountantFilesService,
    private readonly clamavService: ClamavService,
  ) {}

  /**
   * Upload a file with security scanning
   * 
   * Process flow:
   * 1. File is received via multipart/form-data (Multer middleware)
   * 2. Validate file type and size
   * 3. Generate SHA256 hash and check for duplicates
   * 4. Scan file for malware using ClamAV
   * 5. If clean and unique: save to database and return success
   * 6. If infected or duplicate: reject upload and return error
   * 
   * @param file - Uploaded file from multipart form data
   * @param req - Request object with authenticated user info
   * @returns Object with success message and file ID
   * @throws BadRequestException if file is invalid, duplicate, or infected
   * @throws InternalServerErrorException if scanning fails
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), // Store in memory for scanning before DB
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  }))
  async upload(@UploadedFile() file: any, @Request() req: AuthenticatedRequest) {
    // Type assertion for uploaded file
    const f = file as UploadedFileLocal;
    
    // Step 1: Validate file type and size
    // This provides first layer of defense before expensive malware scan
    this.service.validateFile(f);

    try {
      // Step 2: Scan file for malware using ClamAV
      // File is temporarily written to /tmp, scanned, then deleted
      const isClean = await this.clamavService.scanFile(f.buffer, f.originalname);

      // Step 3: Check scan result
      if (!isClean) {
        // File is infected - reject the upload immediately
        throw new BadRequestException(
          'File upload rejected: malware detected. Please scan your files before uploading.'
        );
      }

      // Step 4: File is clean - save to database (includes duplicate check)
      // The create method will check for duplicates via SHA256 hash
      const saved = await this.service.create(f, req.user?.userId);

      // Step 5: Return success response with file ID
      return {
        success: true,
        message: 'File uploaded successfully',
        id: saved.id,
        filename: saved.filename,
      };
    } catch (error) {
      // Handle different error types appropriately
      if (error instanceof BadRequestException) {
        // Re-throw BadRequestException (from validation, malware detection, or duplicate check)
        throw error;
      }
      
      // For any other errors (e.g., ClamAV failures), return generic error
      // Don't expose internal error details to prevent information leakage
      throw new InternalServerErrorException(
        'File upload failed. Please try again later or contact support.'
      );
    }
  }

  /**
   * List all uploaded files
   * 
   * Returns metadata for all files (excluding file content for performance)
   * Files are sorted by upload date (newest first)
   * 
   * @returns Object containing array of file metadata
   */
  @Get()
  async list() {
    const items = await this.service.list();
    return { files: items };
  }

  /**
   * Download a specific file by ID
   * 
   * Returns the file content with appropriate headers for download
   * 
   * @param id - File UUID
   * @param res - Express response object
   * @returns File content as buffer
   * @throws BadRequestException if file not found
   */
  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const f = await this.service.getFile(id);
    res.setHeader('Content-Type', f.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(f.filename)}"`);
    return res.send(Buffer.from(f.data));
  }

  /**
   * Delete a file by ID
   * 
   * Allows users to delete files with permission checks:
   * - Super admins can delete any file
   * - Regular accountants can only delete their own files
   * 
   * For FYP: This demonstrates proper authorization where different user roles
   * have different levels of access to resources. This prevents unauthorized
   * data deletion while allowing legitimate file management.
   * 
   * @param id - File UUID to delete
   * @param req - Request object with authenticated user info
   * @returns Success message
   * @throws NotFoundException if file doesn't exist
   * @throws ForbiddenException if user lacks permission to delete
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    // Delete the file with permission checking
    await this.service.deleteFile(id, req.user?.userId, req.user?.role);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
