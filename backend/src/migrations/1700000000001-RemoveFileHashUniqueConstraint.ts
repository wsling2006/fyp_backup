import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveFileHashUniqueConstraint1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint on file_hash
    // This allows the same file to be uploaded multiple times (for different announcements or after deletion)
    await queryRunner.query(`
      ALTER TABLE "announcement_attachments" 
      DROP CONSTRAINT IF EXISTS "UQ_39a0b1eeb8ce949c6f0bc8c169e";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the unique constraint back if we need to rollback
    await queryRunner.query(`
      ALTER TABLE "announcement_attachments" 
      ADD CONSTRAINT "UQ_39a0b1eeb8ce949c6f0bc8c169e" UNIQUE ("file_hash");
    `);
  }
}
