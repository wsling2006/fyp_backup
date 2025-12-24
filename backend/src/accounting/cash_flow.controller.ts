import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CashFlowService } from './cash_flow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('cash-flows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashFlowController {
  constructor(private readonly service: CashFlowService) {}

  @Get()
  @Roles(Role.ACCOUNTANT)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.ACCOUNTANT)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ACCOUNTANT)
  create(@Body() data) {
    return this.service.create(data);
  }

  @Put(':id')
  @Roles(Role.ACCOUNTANT)
  update(@Param('id') id: string, @Body() data) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ACCOUNTANT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
