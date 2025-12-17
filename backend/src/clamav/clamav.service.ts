import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ClamAV Service
 * 
 * This service provides malware scanning functionality using ClamAV.
 * Files are temporarily saved to disk, scanned with clamscan, and then deleted.
 * 
 * Prerequisites:
 * - ClamAV must be installed on the system (brew install clamav on macOS)
 * - freshclam must be run to update virus definitions
 * - clamd daemon should be running for faster scans (optional)
 * 
 * For FYP: This demonstrates defense-in-depth security by scanning uploaded files
 * before storing them in the database to prevent malware distribution.
 */
@Injectable()
export class ClamavService {
  private readonly logger = new Logger(ClamavService.name);
  private readonly tmpDir = '/tmp'; // Temporary directory for file scanning

  /**
   * Scan a file buffer for malware using ClamAV
   * 
   * @param fileBuffer - The file content as a Buffer
   * @param originalFilename - Original filename (for logging and temporary file creation)
   * @returns Promise<boolean> - Returns true if file is clean, false if infected
   * @throws InternalServerErrorException if scanning fails
   */
  async scanFile(fileBuffer: Buffer, originalFilename: string): Promise<boolean> {
    // Generate a unique temporary filename to avoid collisions
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const tmpFilename = `upload_${timestamp}_${random}_${originalFilename}`;
    const tmpFilePath = path.join(this.tmpDir, tmpFilename);

    try {
      // Step 1: Write the uploaded file buffer to a temporary file on disk
      this.logger.log(`Writing temporary file for scanning: ${tmpFilename}`);
      await fs.writeFile(tmpFilePath, fileBuffer);

      // Step 2: Scan the temporary file with ClamAV
      this.logger.log(`Scanning file with ClamAV: ${tmpFilename}`);
      const scanResult = await this.executeClamScan(tmpFilePath);

      // Step 3: Parse scan result
      if (scanResult.isClean) {
        this.logger.log(`File is clean: ${tmpFilename}`);
        return true;
      } else {
        this.logger.warn(`Malware detected in file: ${tmpFilename} - ${scanResult.threat}`);
        return false;
      }
    } catch (error) {
      // Log the error but don't expose internal details to the client
      this.logger.error(`Error scanning file ${tmpFilename}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('File scanning failed. Please try again later.');
    } finally {
      // Step 4: Always clean up - delete the temporary file regardless of scan result
      try {
        await fs.unlink(tmpFilePath);
        this.logger.log(`Temporary file deleted: ${tmpFilename}`);
      } catch (unlinkError) {
        // Log but don't throw - we don't want cleanup failures to break the flow
        this.logger.error(`Failed to delete temporary file ${tmpFilename}: ${unlinkError.message}`);
      }
    }
  }

  /**
   * Execute ClamAV scan using clamscan command
   * 
   * @param filePath - Absolute path to the file to scan
   * @returns Object containing scan results
   * @private
   */
  private async executeClamScan(filePath: string): Promise<{ isClean: boolean; threat?: string }> {
    try {
      // Execute clamscan command
      // --no-summary: Don't print summary at the end
      // --infected: Only print infected files
      // The command will exit with code 0 if clean, 1 if infected
      const { stdout, stderr } = await execAsync(`clamscan --no-summary "${filePath}"`);

      // If we reach here with no error, file is clean (exit code 0)
      return { isClean: true };
    } catch (error) {
      // clamscan returns non-zero exit code if malware is found or if there's an error
      const stderr = error.stderr || '';
      const stdout = error.stdout || '';
      
      // Check if this is a "virus found" error (exit code 1)
      if (error.code === 1 && stdout.includes('FOUND')) {
        // Extract the threat name from the output
        // Format is usually: "filename: VirusName FOUND"
        const match = stdout.match(/: (.+) FOUND/);
        const threat = match ? match[1] : 'Unknown threat';
        return { isClean: false, threat };
      }

      // If we're here, it's a real error (not just a virus found)
      // Common errors: ClamAV not installed, database outdated, permission issues
      this.logger.error(`ClamAV scan error: ${stderr || error.message}`);
      
      // Provide helpful error messages for common issues
      if (error.message.includes('command not found') || error.code === 127) {
        throw new Error('ClamAV is not installed. Please install ClamAV (brew install clamav on macOS).');
      }
      if (stdout.includes('Database status: No') || stderr.includes('can\'t open file or directory')) {
        throw new Error('ClamAV virus database not initialized. Please run: sudo freshclam');
      }
      
      throw new Error(`ClamAV scan failed: ${error.message}`);
    }
  }

  /**
   * Check if ClamAV is available and properly configured
   * This can be called at application startup to verify ClamAV setup
   * 
   * @returns Promise<boolean> - Returns true if ClamAV is ready
   */
  async checkClamAvAvailability(): Promise<boolean> {
    try {
      await execAsync('clamscan --version');
      this.logger.log('ClamAV is available and ready');
      return true;
    } catch (error) {
      this.logger.warn('ClamAV is not available or not properly configured');
      return false;
    }
  }
}
