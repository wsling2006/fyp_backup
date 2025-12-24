import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug('JwtAuthGuard: Starting authentication');
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.debug(`JwtAuthGuard: Authorization header = ${authHeader ? 'Present' : 'Missing'}`);
    
    try {
      // Call parent canActivate which triggers Passport JWT strategy
      const result = await super.canActivate(context) as boolean;
      
      this.logger.debug(`JwtAuthGuard: Passport validation result = ${result}`);
      this.logger.debug(`JwtAuthGuard: req.user after validation = ${JSON.stringify(request.user)}`);
      
      return result;
    } catch (error) {
      this.logger.error(`JwtAuthGuard: Authentication failed - ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug(`JwtAuthGuard handleRequest: err=${err?.message}, user=${JSON.stringify(user)}, info=${info?.message}`);
    
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
