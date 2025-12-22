import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Revenue } from './revenue.entity';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * Revenue Module
 * 
 * Encapsulates all revenue-related functionality:
 * - Entity (database model)
 * - Service (business logic)
 * - Controller (HTTP endpoints)
 * 
 * For FYP: Demonstrates modular architecture and
 * separation of concerns in NestJS applications.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Revenue]),
    AuditModule,
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService], // Export if other modules need revenue data
})
export class RevenueModule {}
