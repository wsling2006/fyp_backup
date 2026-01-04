import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequest } from './purchase_request.entity';
import { PurchaseRequestService } from './purchase_request.service';
import { PurchaseRequestController } from './purchase_request.controller';
import { EmployeesModule } from '../employees/employees.module';
import { Employee } from '../employees/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseRequest,
      Employee, // Add Employee entity for repository injection
    ]),
    EmployeesModule, // Import EmployeesModule for DI
  ],
  providers: [
    PurchaseRequestService,
  ],
  controllers: [
    PurchaseRequestController,
  ],
})
export class AccountingModule {}
