import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1703000000000 implements MigrationInterface {
    name = 'CreateUsersTable1703000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create roles enum if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'accountant', 'human_resources', 'marketing', 'sales_department');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" varchar NOT NULL,
                "password_hash" varchar NOT NULL,
                "role" "public"."users_role_enum" NOT NULL,
                "phone" varchar,
                "address" varchar,
                "emergency_contact" varchar,
                "mfa_enabled" boolean NOT NULL DEFAULT true,
                "last_password_change" timestamp,
                "otp_code" varchar,
                "otp_expires_at" timestamp,
                "otp_reset" varchar,
                "otp_reset_expires_at" timestamp,
                "is_active" boolean NOT NULL DEFAULT true,
                "suspended" boolean NOT NULL DEFAULT false,
                "last_login_at" timestamp,
                "failed_login_attempts" integer NOT NULL DEFAULT 0,
                "account_locked_until" timestamp,
                "created_by_id" uuid,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    }
}
