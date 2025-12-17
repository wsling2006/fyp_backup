import { Controller, Post, Body, UseGuards, Req, HttpException, HttpStatus, ClassSerializerInterceptor, UseInterceptors, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from './roles.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('assign-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async assignRole(
    @Body() body: { email: string; role: Role },
    @Req() req: any,
  ) {
    // Validate role
    if (!Object.values(Role).includes(body.role)) {
      return { message: 'Invalid role' };
    }
    // Assign role
    await this.usersService.assignRole(body.email, body.role);
    return { message: 'Role assigned successfully' };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() body: { email: string; password: string; role: Role }) {
    try {
      // Validate required fields
      if (!body.email || !body.password || !body.role) {
        throw new HttpException('Email, password, and role are required', HttpStatus.BAD_REQUEST);
      }
      
      // Validate role
      if (!Object.values(Role).includes(body.role)) {
        throw new HttpException(`Invalid role. Valid roles are: ${Object.values(Role).join(', ')}`, HttpStatus.BAD_REQUEST);
      }
      
      const user = await this.usersService.createUser(body);
      // Return user without sensitive fields
      const { password_hash, otp_code, otp_expires_at, ...userResponse } = user;
      return { 
        message: 'User created successfully', 
        user: userResponse 
      };
    } catch (error) {
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      // Log the error for debugging
      console.error('Error creating user:', error);
      throw new HttpException(
        error.message || 'Failed to create user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async listUsers() {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Get('count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async countUsers() {
    const total = await this.usersService.count();
    return { total };
  }

  @Get('recent-logins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async recentLogins(@Query('limit') limit = 10) {
    const users = await this.usersService.findRecentLogins(Number(limit));
    return { users };
  }

  @Post('suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async suspend(@Body() body: { id: string; until?: string }) {
    const untilDate = body.until ? new Date(body.until) : null;
    const updated = await this.usersService.suspendUser(body.id, untilDate);
    return { message: untilDate ? 'User suspended' : 'User suspension cleared', user: updated };
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async delete(@Body() body: { id: string }) {
    await this.usersService.deleteUser(body.id);
    return { message: 'User deleted' };
  }
}
