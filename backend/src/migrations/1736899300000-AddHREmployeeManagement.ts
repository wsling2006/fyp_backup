import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddHREmployeeManagement1736899300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new fields to employees table
    await queryRunner.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TERMINATED')),
      ADD COLUMN IF NOT EXISTS ic_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS birthday DATE,
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
    `);

    // Step 2: Create employee_documents table
    await queryRunner.createTable(
      new Table({
        name: 'employee_documents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'employee_id',
            type: 'uuid',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'mimetype',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'data',
            type: 'bytea',
          },
          {
            name: 'file_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'document_type',
            type: 'enum',
            enum: ['RESUME', 'EMPLOYMENT_CONTRACT', 'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'OTHER'],
            default: "'OTHER'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'uploaded_by_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Step 3: Add foreign key for employee_id
    await queryRunner.createForeignKey(
      'employee_documents',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Step 4: Add foreign key for uploaded_by_id
    await queryRunner.createForeignKey(
      'employee_documents',
      new TableForeignKey({
        columnNames: ['uploaded_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Step 5: Create index on file_hash for duplicate detection
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_documents_file_hash 
      ON employee_documents(file_hash);
    `);

    // Step 6: Create index on employee_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id 
      ON employee_documents(employee_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop employee_documents table
    await queryRunner.dropTable('employee_documents', true);

    // Remove new columns from employees table
    await queryRunner.query(`
      ALTER TABLE employees 
      DROP COLUMN IF EXISTS employee_id,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS ic_number,
      DROP COLUMN IF EXISTS birthday,
      DROP COLUMN IF EXISTS bank_account_number;
    `);
  }
}
