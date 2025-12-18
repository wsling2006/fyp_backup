import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { User } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 60;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(email: string, password: string) {
    const hash = await argon2.hash(password);
    const now = new Date();
    return this.usersService.create({
      email,
      password_hash: hash,
      last_password_change: now,
    });
  }

  async login(email: string, password: string, req?: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Block deactivated accounts
    if (user.is_active === false) {
      throw new ForbiddenException({
        message: 'Your account is inactive. Please contact an administrator.',
        inactive: true,
        email: user.email,
      });
    }

    if (user.suspended) {
      throw new ForbiddenException({
        message: 'Your account has been suspended. Please contact an administrator.',
        suspended: true,
        email: user.email,
      });
    }

    if (user.isAccountLocked()) {
      const isLockoutFlow = !!(user.otp_reset && user.otp_reset_expires_at && user.otp_reset_expires_at > new Date()) || !!(user.otp_code && user.otp_expires_at && user.otp_expires_at > new Date());
      if (isLockoutFlow) {
        throw new UnauthorizedException({
          message: 'Account is locked. Please follow the instructions sent to your email.',
          locked: true,
          email: user.email,
        });
      }
      // Manual suspension (no OTP set)
      throw new UnauthorizedException({
        message: 'Your account has been suspended. Please contact an administrator.',
        suspended: true,
        email: user.email,
      });
    }

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      return this.handleFailedLogin(user);
    }

    user.failed_login_attempts = 0;
    user.account_locked_until = null;

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      // Generate and send OTP instead of returning token directly
      const otp = this.generateOtp();
      user.otp_code = otp;
      user.otp_expires_at = this.generateOtpExpiry();
      await this.usersService.create(user);
      await this.sendOtpEmail(user, otp);

      // Suspicious login check (non-office hours) happens after MFA success in verifyOtp
      return {
        requiresOtp: true,
        message: 'OTP sent to your email. Please verify to complete login.',
        email: user.email,
      };
    }

    // If MFA is disabled, generate JWT directly
    user.last_login_at = new Date();
    await this.usersService.create(user);

    // Notify superadmins if login is outside office hours
    await this.notifyAdminsIfNonOfficeHours(user);

    const payload = { sub: user.id, role: user.role };
    return {
      requiresOtp: false,
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async sendOtpEmail(user: User, otp: string, isReset = false) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
    await transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: user.email,
      subject: isReset ? 'Your Password Reset OTP' : 'Your OTP Code',
      text: isReset
        ? `Your OTP for password reset is: ${otp}`
        : `Your OTP code is: ${otp}`,
    });
  }

  async requestOtp(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const otp = this.generateOtp();
    user.otp_code = otp;
    user.otp_expires_at = this.generateOtpExpiry();
    await this.usersService.create(user); // save updated user
    await this.sendOtpEmail(user, otp);
    return { message: 'OTP sent to email' };
  }

  async verifyOtp(email: string, otp: string, req?: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');

    // First, check if the OTP is for password reset (account lock or forgot password)
    if (user.otp_reset && user.otp_reset_expires_at && user.otp_reset_expires_at > new Date()) {
      // Disallow reset flow for suspended accounts
      if (user.is_active === false) {
        throw new ForbiddenException('Account inactive. Password reset not allowed until reactivated by an administrator.');
      }
      if (user.suspended) {
        throw new ForbiddenException('Account suspended. Password reset not allowed until reactivated by an administrator.');
      }
      if (user.otp_reset !== otp) throw new UnauthorizedException('Invalid OTP for password reset');

      // Do NOT clear otp_reset here; keep it until reset-password completes

      return {
        otp_reset: otp,
        type: 'reset',
      };
    }

    // Then, check if the OTP is for MFA login
    if (user.otp_code && user.otp_expires_at && user.otp_expires_at > new Date()) {
      if (user.otp_code !== otp) throw new UnauthorizedException('Invalid OTP for MFA login');

      // Clear MFA OTP after successful verification
      user.otp_code = '';
      user.otp_expires_at = null;
      user.last_login_at = new Date();
      await this.usersService.create(user);

      // Notify superadmins if login is outside office hours
      await this.notifyAdminsIfNonOfficeHours(user);

      const payload = { sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
        user: { id: user.id, email: user.email, role: user.role },
        type: 'mfa',
      };
    }

    throw new UnauthorizedException('OTP not valid or expired');
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.is_active === false) {
      throw new ForbiddenException('Account inactive. Contact admin to reactivate before requesting a password reset.');
    }
    if (user.suspended) {
      // Do not allow password reset for suspended accounts
      throw new ForbiddenException('Account suspended. Contact admin to reactivate before requesting a password reset.');
    }
    const otp = this.generateOtp();
    // Set password reset OTP
    user.otp_reset = otp;
    user.otp_reset_expires_at = this.generateOtpExpiry();
    await this.usersService.create(user);
    await this.sendOtpEmail(user, otp, true);
    return { message: 'OTP sent to email for password reset' };
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.otp_reset || !user.otp_reset_expires_at) throw new UnauthorizedException('OTP not requested');
    if (user.is_active === false) throw new ForbiddenException('Account inactive. Password reset not allowed until reactivated by an administrator.');
    if (user.suspended) throw new ForbiddenException('Account suspended. Password reset not allowed until reactivated by an administrator.');
    if (user.otp_reset !== otp) throw new UnauthorizedException('Invalid OTP');
    if (user.otp_reset_expires_at < new Date()) throw new UnauthorizedException('OTP expired');
    // Do not clear otp_reset here; reset-password endpoint will clear it on completion
    return { otp_reset: otp, message: 'OTP verified, you may now reset your password' };
  }

  async resetPassword(email: string, otp_reset: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) throw new UnauthorizedException('Passwords do not match');
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.otp_reset || !user.otp_reset_expires_at) throw new UnauthorizedException('OTP not requested');
    if (user.is_active === false) {
      throw new ForbiddenException('Account inactive. Password reset not allowed until account is reactivated by an administrator.');
    }
    if (user.suspended) {
      throw new ForbiddenException('Account suspended. Password reset not allowed until account is reactivated by an administrator.');
    }
    if (user.otp_reset !== otp_reset) throw new UnauthorizedException('Invalid OTP');
    if (user.otp_reset_expires_at < new Date()) throw new UnauthorizedException('OTP expired');
    user.password_hash = await argon2.hash(newPassword);
    user.last_password_change = new Date();
    user.otp_reset = '';
    user.otp_reset_expires_at = null;
    user.failed_login_attempts = 0;
    user.account_locked_until = null;
    await this.usersService.create(user);
    return { message: 'Password reset successful' };
  }

  private async handleFailedLogin(user: User): Promise<never> {
    user.failed_login_attempts = (user.failed_login_attempts ?? 0) + 1;
    if (user.failed_login_attempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.lockAccount(user);
      throw new UnauthorizedException({
        message: 'Account locked after too many failed attempts. Check your email for unlock instructions.',
        locked: true,
        email: user.email,
      });
    }
    await this.usersService.create(user);
    throw new UnauthorizedException('Invalid credentials');
  }

  private async lockAccount(user: User) {
    user.account_locked_until = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
    const otp = this.generateOtp();
    // Use password reset OTP for locked accounts
    user.otp_reset = otp;
    user.otp_reset_expires_at = this.generateOtpExpiry();
    await this.usersService.create(user);
    // Send password reset OTP email
    await this.sendAccountLockedEmail(user, otp);
  }

  private async sendAccountLockedEmail(user: User, otp: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
    await transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to: user.email,
      subject: 'Account Locked - Action Required',
      text: `Your account has been locked after too many unsuccessful login attempts.\n\n` +
        `OTP: ${otp} (valid for 5 minutes)\n\n` +
        `Use this OTP on the verification page to unlock your account and reset your password.`,
    });
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateOtpExpiry() {
    return new Date(Date.now() + 5 * 60 * 1000);
  }

  private isNonOfficeHours(date: Date = new Date()): boolean {
    const hour = date.getHours();
    // Office hours: 8 (inclusive) to 18 (exclusive)
    return hour < 8 || hour >= 18;
  }

  private async notifyAdminsIfNonOfficeHours(user: User) {
    try {
      if (!this.isNonOfficeHours(user.last_login_at || new Date())) return;
      const superAdmins = await this.usersService.findSuperAdmins();
      if (!superAdmins || superAdmins.length === 0) return;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASS'),
        },
      });

      const sendPromises = superAdmins.map(admin =>
        transporter.sendMail({
          from: this.configService.get<string>('EMAIL_USER'),
          to: admin.email,
          subject: 'Alert: User login outside office hours',
          text:
            `User ${user.email} logged in at ${user.last_login_at?.toLocaleString() || new Date().toLocaleString()} ` +
            `(outside office hours 08:00–18:00).\n\n` +
            `If this was not expected, please review and take action.`,
        })
      );

      await Promise.allSettled(sendPromises);
    } catch (err) {
      // Log and continue; do not block login for email failures
      console.error('[Auth] Failed to send non-office hours alert:', err);
    }
  }
}
