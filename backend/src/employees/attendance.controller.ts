import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('employees/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Post()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  create(@Body() data) {
    return this.attendanceService.create(data);
  }

  @Put(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data) {
    return this.attendanceService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
