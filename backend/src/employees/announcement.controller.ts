import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('announcements')
@UseGuards(RolesGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findAll() {
    return this.announcementService.findAll();
  }

  @Get(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  @Post()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  create(@Body() data) {
    return this.announcementService.create(data);
  }

  @Put(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data) {
    return this.announcementService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }
}
