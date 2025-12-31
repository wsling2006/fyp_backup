import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecureAccountantController } from './secure-accountant.controller';
import { PurchaseRequestService } from '../purchase-requests/purchase-request.service';
import { PurchaseRequest } from '../purchase-requests/purchase-request.entity';
import { Claim } from '../purchase-requests/claim.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { ClamavModule } from '../clamav/clamav.module';
import { ConfigModule } from '@nestjs/config';

/**
 * Accountant Module
 * 
 * Provides secure endpoints for accountant-specific operations.
 * All endpoints require:
 * - JWT Authentication
 * - Accountant or SuperAdmin role
 * - MFA session verification
 * - Comprehensive audit logging
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequest, Claim]),
    UsersModule,
    AuditModule,
    ClamavModule,
    ConfigModule,
  ],
  controllers: [SecureAccountantController],
  providers: [PurchaseRequestService],
})
export class AccountantModule {}
