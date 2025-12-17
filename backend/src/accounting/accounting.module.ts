import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyRevenue } from './company_revenue.entity';
import { CashFlow } from './cash_flow.entity';
import { FinancialStatement } from './financial_statement.entity';
import { PurchaseRequest } from './purchase_request.entity';
import { Supplier } from './supplier.entity';
import { AnnualExpense } from './annual_expense.entity';
import { PayrollReport } from './payroll_report.entity';
import { CompanyRevenueService } from './company_revenue.service';
import { CompanyRevenueController } from './company_revenue.controller';
import { CashFlowService } from './cash_flow.service';
import { CashFlowController } from './cash_flow.controller';
import { FinancialStatementService } from './financial_statement.service';
import { FinancialStatementController } from './financial_statement.controller';
import { PurchaseRequestService } from './purchase_request.service';
import { PurchaseRequestController } from './purchase_request.controller';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { AnnualExpenseService } from './annual_expense.service';
import { AnnualExpenseController } from './annual_expense.controller';
import { PayrollReportService } from './payroll_report.service';
import { PayrollReportController } from './payroll_report.controller';
import { EmployeesModule } from '../employees/employees.module';
import { Employee } from '../employees/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyRevenue,
      CashFlow,
      FinancialStatement,
      PurchaseRequest,
      Supplier,
      AnnualExpense,
      PayrollReport,
      Employee, // Add Employee entity for repository injection
    ]),
    EmployeesModule, // Import EmployeesModule for DI
  ],
  providers: [
    CompanyRevenueService,
    CashFlowService,
    FinancialStatementService,
    PurchaseRequestService,
    SupplierService,
    AnnualExpenseService,
    PayrollReportService,
  ],
  controllers: [
    CompanyRevenueController,
    CashFlowController,
    FinancialStatementController,
    PurchaseRequestController,
    SupplierController,
    AnnualExpenseController,
    PayrollReportController,
  ],
})
export class AccountingModule {}
