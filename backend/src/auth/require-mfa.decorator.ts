import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark an endpoint as requiring MFA/OTP verification
 * 
 * Usage:
 * @RequireMfa()
 * @Post('sensitive-action')
 * async doSensitiveAction() { ... }
 */
export const RequireMfa = () => SetMetadata('requireMfa', true);
