import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * MFA/OTP Verification Guard
 * 
 * This guard checks if the request includes a valid OTP for sensitive operations.
 * It does NOT verify the OTP itself - that's done by the service layer.
 * 
 * This guard simply checks if OTP verification is required and ensures
 * the request includes an OTP header or body parameter.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, MfaGuard)
 * @RequireMfa()
 * async sensitiveOperation() { ... }
 */
@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if MFA is required for this endpoint
    const requireMfa = this.reflector.get<boolean>('requireMfa', context.getHandler());
    
    // If MFA not required, allow through
    if (!requireMfa) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Check for OTP in request body or headers
    const otpFromBody = request.body?.otp;
    const otpFromHeader = request.headers['x-otp-code'];
    
    if (!otpFromBody && !otpFromHeader) {
      throw new UnauthorizedException({
        requiresOtp: true,
        message: 'This action requires OTP verification. Please provide a valid OTP code.',
      });
    }

    // OTP exists - actual verification happens in service layer
    // Attach OTP to request for service to use
    request.otpCode = otpFromBody || otpFromHeader;
    
    return true;
  }
}
