import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../users/roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    
    this.logger.debug(`RolesGuard: Required roles = ${JSON.stringify(requiredRoles)}`);
    
    if (!requiredRoles) {
      this.logger.debug('RolesGuard: No roles required, allowing access');
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    this.logger.debug(`RolesGuard: req.user = ${JSON.stringify(user)}`);
    this.logger.debug(`RolesGuard: req.headers = ${JSON.stringify(request.headers)}`);
    
    if (!user) {
      this.logger.error('RolesGuard: User not authenticated - req.user is undefined');
      throw new ForbiddenException('User not authenticated');
    }
    
    const hasRole = requiredRoles.includes(user.role);
    
    this.logger.debug(`RolesGuard: User role = ${user.role}, hasRole = ${hasRole}`);
    
    if (!hasRole) {
      this.logger.warn(`RolesGuard: Insufficient permissions - User has role ${user.role}, needs one of ${JSON.stringify(requiredRoles)}`);
      throw new ForbiddenException('Insufficient permissions');
    }
    
    this.logger.debug('RolesGuard: Access granted');
    return true;
  }
}
