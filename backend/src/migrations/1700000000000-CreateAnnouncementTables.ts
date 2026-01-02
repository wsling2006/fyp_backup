import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAnnouncementTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create announcements table
    await queryRunner.createTable(
      new Table({
        name: 'announcements',
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
            name: 'content',
            type: 'text',
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['URGENT', 'IMPORTANT', 'GENERAL'],
            default: "'GENERAL'",
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'announcements',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create announcement_acknowledgments table
    await queryRunner.createTable(
      new Table({
        name: 'announcement_acknowledgments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'announcement_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'acknowledged',
            type: 'boolean',
            default: true,
          },
          {
            name: 'acknowledged_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            columnNames: ['announcement_id', 'user_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('announcement_acknowledgments', [
      new TableForeignKey({
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // Create announcement_reactions table
    await queryRunner.createTable(
      new Table({
        name: 'announcement_reactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'announcement_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'reaction_type',
            type: 'enum',
            enum: ['👍', '❤️', '😮', '😢', '❗'],
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            columnNames: ['announcement_id', 'user_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('announcement_reactions', [
      new TableForeignKey({
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // Create announcement_comments table
    await queryRunner.createTable(
      new Table({
        name: 'announcement_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'announcement_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
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

    await queryRunner.createForeignKeys('announcement_comments', [
      new TableForeignKey({
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // Create announcement_attachments table
    await queryRunner.createTable(
      new Table({
        name: 'announcement_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'announcement_id',
            type: 'uuid',
          },
          {
            name: 'original_filename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'stored_filename',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'file_size',
            type: 'bigint',
          },
          {
            name: 'file_hash',
            type: 'varchar',
            length: '64',
            isUnique: true,
          },
          {
            name: 'file_data',
            type: 'bytea',
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
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

    await queryRunner.createForeignKeys('announcement_attachments', [
      new TableForeignKey({
        columnNames: ['announcement_id'],
        referencedTableName: 'announcements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('announcement_attachments');
    await queryRunner.dropTable('announcement_comments');
    await queryRunner.dropTable('announcement_reactions');
    await queryRunner.dropTable('announcement_acknowledgments');
    await queryRunner.dropTable('announcements');
  }
}
