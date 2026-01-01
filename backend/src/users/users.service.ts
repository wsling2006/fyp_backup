import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { Role } from './roles.enum';

@Injectable()
export class UsersService {
  private otpStore = new Map<string, { otp: string; expiresAt: Date; action: string }>();

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private configService: ConfigService,
  ) {}

  create(user: Partial<User>) {
    // If user has an ID, it's an update; otherwise, it's a create
    if (user.id) {
      return this.usersRepo.save(user);
    }
    const newUser = this.usersRepo.create(user);
    return this.usersRepo.save(newUser);
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async createSuperAdmin(email: string, password: string) {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) return existing;
    const password_hash = await argon2.hash(password);
    const superAdmin = this.usersRepo.create({
      email,
      password_hash,
      role: Role.SUPER_ADMIN,
    });
    return this.usersRepo.save(superAdmin);
  }

  async assignRole(email: string, role: Role) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) throw new Error('User not found');
    user.role = role;
    return this.usersRepo.save(user);
  }

  async createUser(body: { email: string; password: string; role: Role }) {
    // Check if user already exists
    const existing = await this.usersRepo.findOne({ where: { email: body.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    
    const password_hash = await argon2.hash(body.password);
    const user = this.usersRepo.create({
      email: body.email,
      password_hash,
      role: body.role,
      mfa_enabled: true,
      // ...other fields if needed
    });
    return this.usersRepo.save(user);
  }

  findAll() {
    return this.usersRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  count() {
    return this.usersRepo.count();
  }

  async findRecentLogins(limit = 10) {
    return this.usersRepo.find({
      order: { last_login_at: 'DESC' },
      take: limit,
    });
  }

  async findSuperAdmins() {
    return this.usersRepo.find({ where: { role: Role.SUPER_ADMIN, is_active: true } });
  }

  async suspendUser(id: string, until: Date | null) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    user.account_locked_until = until;
    // reset failed attempts when applying manual suspension
    if (until && until > new Date()) {
      user.failed_login_attempts = 0;
      user.suspended = true;
    }
    // If clearing suspension (null or past), mark suspended false
    if (!until || (until && until <= new Date())) {
      user.suspended = false;
    }
    return this.usersRepo.save(user);
  }

  async deleteUser(id: string) {
    return this.usersRepo.delete(id);
  }

  /**
   * Generate OTP for sensitive operations
   * Sends OTP via email using nodemailer
   */
  async generateOtp(userId: string, action: string): Promise<{ otp: string; message: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

    // Store OTP in memory (same as purchase-requests)
    this.otpStore.set(`${userId}:${action}`, {
      otp,
      expiresAt,
      action,
    });

    // Send OTP email
    await this.sendOtpEmail(user, otp, action);

    return {
      otp,
      message: 'OTP sent to your email. Please check and enter the code to proceed.',
    };
  }

  /**
   * Verify OTP for an action
   */
  verifyOtp(userId: string, otp: string, action: string): void {
    const key = `${userId}:${action}`;
    const stored = this.otpStore.get(key);

    if (!stored) {
      throw new UnauthorizedException('OTP not found or expired. Please request a new OTP.');
    }

    if (stored.expiresAt < new Date()) {
      this.otpStore.delete(key);
      throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    // OTP is valid - delete it (one-time use)
    this.otpStore.delete(key);
  }

  /**
   * Send OTP email using nodemailer
   */
  private async sendOtpEmail(user: any, otp: string, action: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    const actionDescriptions: { [key: string]: string } = {
      DELETE_EMPLOYEE: 'delete an employee record (irreversible action)',
      CLEAR_AUDIT_LOGS: 'clear all audit logs',
      DELETE_PURCHASE_REQUEST: 'delete a purchase request',
      RESET_USER_PASSWORD: 'reset a user password',
    };

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: user.email,
      subject: `OTP Verification - ${action}`,
      html: `
        <h2>FYP System - OTP Verification</h2>
        <p>Hello ${user.email},</p>
        <p>You are attempting to <strong>${actionDescriptions[action] || action}</strong>.</p>
        <p>Your OTP code is: <strong style="font-size: 24px; color: #dc2626;">${otp}</strong></p>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p style="color: #dc2626;"><strong>⚠️ WARNING:</strong> This is a critical action that cannot be undone.</p>
        <p><em>If you did not request this action, please contact your system administrator immediately.</em></p>
        <hr>
        <p style="color: #666; font-size: 12px;">FYP System - Secure Operations</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}
