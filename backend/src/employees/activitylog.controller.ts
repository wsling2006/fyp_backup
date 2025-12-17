import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activitylog.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('activity-logs')
@UseGuards(RolesGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findAll() {
    return this.activityLogService.findAll();
  }

  @Get(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }

  @Post()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  create(@Body() data) {
    return this.activityLogService.create(data);
  }

  @Put(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data) {
    return this.activityLogService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.activityLogService.remove(id);
  }
}
