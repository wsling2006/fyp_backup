import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSuspendedToUsers1734518400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.findColumnByName('suspended');
    
    if (!hasColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'suspended',
          type: 'boolean',
          isNullable: false,
          default: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'suspended');
  }
}
