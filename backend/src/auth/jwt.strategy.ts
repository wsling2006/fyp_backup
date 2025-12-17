import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your_jwt_secret_here', // Should match the one in auth.module.ts
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
    
    return { id: user.id, email: user.email, role: user.role };
  }
}

