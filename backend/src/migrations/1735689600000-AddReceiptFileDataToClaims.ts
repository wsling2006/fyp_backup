import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add receipt_file_data column to claims table
 * 
 * This migration adds a BYTEA column to store receipt files directly in the database,
 * similar to how accountant_files works (which is proven to work correctly).
 * 
 * Benefits:
 * 1. No file system access issues
 * 2. Atomic transactions (file and metadata saved together)
 * 3. Easier backup and recovery
 * 4. No disk space/permission issues
 * 5. Consistent with accountant_files approach
 * 
 * Backwards compatibility:
 * - New column is nullable
 * - Existing records keep their file_path
 * - New uploads will use receipt_file_data
 * - Old records can be migrated later if needed
 */
export class AddReceiptFileDataToClaims1735689600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add BYTEA column to store file data in database
    await queryRunner.addColumn(
      'claims',
      new TableColumn({
        name: 'receipt_file_data',
        type: 'bytea',
        isNullable: true,
        comment: 'Receipt file binary data stored in database (preferred over file_path)',
      }),
    );

    // Add size column to track file size
    await queryRunner.addColumn(
      'claims',
      new TableColumn({
        name: 'receipt_file_size',
        type: 'bigint',
        isNullable: true,
        comment: 'File size in bytes',
      }),
    );

    // Add mimetype column for proper content-type handling
    await queryRunner.addColumn(
      'claims',
      new TableColumn({
        name: 'receipt_file_mimetype',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'MIME type of the receipt file',
      }),
    );

    console.log('✓ Added receipt_file_data, receipt_file_size, and receipt_file_mimetype columns to claims table');
    console.log('  New uploads will store files in database instead of disk');
    console.log('  This matches the working accountant_files implementation');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if rolling back
    await queryRunner.dropColumn('claims', 'receipt_file_mimetype');
    await queryRunner.dropColumn('claims', 'receipt_file_size');
    await queryRunner.dropColumn('claims', 'receipt_file_data');
    
    console.log('✓ Removed receipt_file_data, receipt_file_size, and receipt_file_mimetype columns from claims table');
  }
}
