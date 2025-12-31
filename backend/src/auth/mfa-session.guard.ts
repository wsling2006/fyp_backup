import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * MFA Session Verification Guard
 * 
 * Ensures that the user's session has been verified with MFA (OTP).
 * This guard checks if the user logged in with MFA and their session is verified.
 * 
 * Different from MfaGuard which checks for OTP in the request.
 * This guard checks if the user's SESSION was created with MFA verification.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, MfaSessionGuard)
 * 
 * The guard expects req.user.mfaVerified to be set to true during JWT creation.
 */
@Injectable()
export class MfaSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if the user's session was created with MFA verification
    // This should be set in the JWT payload when user logs in with OTP
    if (!user.mfaVerified && !user.mfa_verified) {
      throw new ForbiddenException(
        'Multi-factor authentication required. Please log in with MFA to access this resource.',
      );
    }

    return true;
  }
}
