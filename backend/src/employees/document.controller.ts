import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('employees/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findAll() {
    return this.documentService.findAll();
  }

  @Get(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Post()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  create(@Body() data) {
    return this.documentService.create(data);
  }

  @Put(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() data) {
    return this.documentService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }
}
