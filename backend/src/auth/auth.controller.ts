import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: Request) {
    return this.authService.login(body.email, body.password, req);
  }

  @Post('request-otp')
  async requestOtp(@Body() body: { email: string; password: string }, @Req() req: Request) {
    return this.authService.requestOtp(body.email, body.password);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }, @Req() req: Request) {
    return this.authService.verifyOtp(body.email, body.otp, req);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyResetOtp(body.email, body.otp);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; otp_reset: string; newPassword: string; confirmPassword: string }) {
    return this.authService.resetPassword(body.email, body.otp_reset, body.newPassword, body.confirmPassword);
  }
}
