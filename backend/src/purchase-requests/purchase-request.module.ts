import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequest } from './purchase-request.entity';
import { Claim } from './claim.entity';
import { PurchaseRequestService } from './purchase-request.service';
import { PurchaseRequestController } from './purchase-request.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { ClamavModule } from '../clamav/clamav.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequest, Claim]),
    UsersModule,
    AuthModule,
    ClamavModule,
  ],
  controllers: [PurchaseRequestController],
  providers: [PurchaseRequestService],
  exports: [PurchaseRequestService],
})
export class PurchaseRequestModule {}
