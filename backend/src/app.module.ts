import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { HRModule } from './employees/hr.module';
import { AccountingModule } from './accounting/accounting.module';
import { AccountantFilesModule } from './accountant-files/accountant-files.module';
import { RevenueModule } from './revenue/revenue.module';
import { AuditModule } from './audit/audit.module';
import { PurchaseRequestModule } from './purchase-requests/purchase-request.module';
import { AccountantModule } from './accountant/accountant.module';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database connection setup
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5433'), 10),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'leejw1354'),
        database: configService.get<string>('DB_NAME', 'fyp_db'),
        autoLoadEntities: true,
        // PRODUCTION: Set synchronize to false and use migrations instead
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // Register your entities
    TypeOrmModule.forFeature([User]),

    // Feature modules
    UsersModule,
    AuthModule,
    EmployeesModule,
    HRModule,
    AccountingModule,
    AccountantFilesModule,
    RevenueModule,
    AuditModule,
    PurchaseRequestModule,
    AccountantModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
