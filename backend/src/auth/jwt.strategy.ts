import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback_dev_secret_change_in_production'),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If the account is suspended (account_locked_until in the future), reject the token
    if (user.account_locked_until && user.account_locked_until > new Date()) {
      throw new UnauthorizedException('Account is suspended');
    }

    // If the account is marked inactive, reject as well
    if (user.is_active === false) {
      throw new UnauthorizedException('Account is inactive');
    }
    
    // Return normalized user object expected by controllers/requests
    // Controllers expect req.user.userId and req.user.username
    return { userId: user.id, username: user.email, role: user.role };
  }
}

