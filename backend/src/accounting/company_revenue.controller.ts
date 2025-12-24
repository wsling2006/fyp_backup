import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CompanyRevenueService } from './company_revenue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('accounting/company-revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyRevenueController {
  constructor(private readonly service: CompanyRevenueService) {}

  @Get()
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  create(@Body() data) {
    return this.service.create(data);
  }

  @Put(':id')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
