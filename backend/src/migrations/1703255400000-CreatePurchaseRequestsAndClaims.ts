import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePurchaseRequestsAndClaims1703255400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create purchase_requests table
    await queryRunner.createTable(
      new Table({
        name: 'purchase_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'department',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'priority',
            type: 'int',
            default: 1,
          },
          {
            name: 'estimated_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'approved_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'],
            default: "'DRAFT'",
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
          },
          {
            name: 'reviewed_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'review_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for created_by_user_id
    await queryRunner.createForeignKey(
      'purchase_requests',
      new TableForeignKey({
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for reviewed_by_user_id
    await queryRunner.createForeignKey(
      'purchase_requests',
      new TableForeignKey({
        columnNames: ['reviewed_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create claims table
    await queryRunner.createTable(
      new Table({
        name: 'claims',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'purchase_request_id',
            type: 'uuid',
          },
          {
            name: 'receipt_file_path',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'receipt_file_original_name',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'vendor_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'amount_claimed',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'purchase_date',
            type: 'date',
          },
          {
            name: 'claim_description',
            type: 'text',
          },
          {
            name: 'uploaded_by_user_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'VERIFIED', 'PROCESSED', 'REJECTED'],
            default: "'PENDING'",
          },
          {
            name: 'verified_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'verification_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'uploaded_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for purchase_request_id
    await queryRunner.createForeignKey(
      'claims',
      new TableForeignKey({
        columnNames: ['purchase_request_id'],
        referencedTableName: 'purchase_requests',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for uploaded_by_user_id
    await queryRunner.createForeignKey(
      'claims',
      new TableForeignKey({
        columnNames: ['uploaded_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for verified_by_user_id
    await queryRunner.createForeignKey(
      'claims',
      new TableForeignKey({
        columnNames: ['verified_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX idx_purchase_requests_created_by ON purchase_requests (created_by_user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests (status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_requests_department ON purchase_requests (department)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_claims_purchase_request ON claims (purchase_request_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_claims_uploaded_by ON claims (uploaded_by_user_id)`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop claims table (foreign keys will be dropped automatically)
    await queryRunner.dropTable('claims', true);

    // Drop purchase_requests table (foreign keys will be dropped automatically)
    await queryRunner.dropTable('purchase_requests', true);
  }
}
