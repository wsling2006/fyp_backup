import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add file_hash column to claims table
 * 
 * Purpose: Enable duplicate file detection for receipt uploads
 * 
 * This migration adds a SHA-256 hash column to the claims table to prevent
 * users from uploading the same receipt file multiple times. The hash is
 * generated from the file content and checked before saving a new claim.
 * 
 * Security benefit: Prevents duplicate receipts and potential fraud
 * Storage benefit: Helps identify duplicate files
 * 
 * The column is nullable to support existing claims without hashes.
 * After deployment, existing claims can be backfilled with hashes if needed.
 */
export class AddFileHashToClaims1736899200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('claims');
    const fileHashColumn = table?.findColumnByName('file_hash');

    if (!fileHashColumn) {
      await queryRunner.addColumn(
        'claims',
        new TableColumn({
          name: 'file_hash',
          type: 'varchar',
          length: '64',
          isNullable: true,
          comment: 'SHA-256 hash of the receipt file for duplicate detection',
        }),
      );

      // Create index on file_hash for fast duplicate lookups
      await queryRunner.query(
        `CREATE INDEX "IDX_claims_file_hash" ON "claims" ("file_hash") WHERE file_hash IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claims_file_hash"`);

    // Remove the column
    await queryRunner.dropColumn('claims', 'file_hash');
  }
}
