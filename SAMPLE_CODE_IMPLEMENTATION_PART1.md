# SAMPLE CODE IMPLEMENTATION - PART 1: Core Architecture & Authentication

**Project:** Zero Trust Access Control System  
**Date:** January 6, 2026  
**Tech Stack:** NestJS (Backend) + Next.js (Frontend) + PostgreSQL  

---

## TABLE OF CONTENTS - PART 1

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [User Entity & Models](#user-entity--models)

---

## 1. SYSTEM OVERVIEW

### 1.1 Technology Stack

**Backend (NestJS)**
```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/typeorm": "^11.0.0",
    "@nestjs/config": "^4.0.2",
    "argon2": "^0.44.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.16.3",
    "typeorm": "^0.3.27",
    "nodemailer": "^7.0.10",
    "speakeasy": "^2.0.0",
    "helmet": "^8.1.0",
    "express-rate-limit": "^8.2.1"
  }
}
```

**Frontend (Next.js)**
```json
{
  "dependencies": {
    "next": "^14.2.35",
    "react": "^18.3.1",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.0.0",
    "framer-motion": "^12.23.26",
    "recharts": "^3.6.0"
  }
}
```

**Database:** PostgreSQL 14+

---

## 2. ARCHITECTURE DESIGN

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  (Browser - React/Next.js Frontend on Port 3001)           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     │ JWT Token in Headers
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS SERVER                            │
│  - Server-Side Rendering (SSR)                              │
│  - API Route Proxy to Backend                               │
│  - Static File Serving                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP (localhost:3000)
                     │ Proxied API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   NESTJS BACKEND API                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers Layer                                    │  │
│  │  - AuthController, UsersController, etc.             │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │  Guards & Middleware                                  │  │
│  │  - JwtAuthGuard (validates JWT)                      │  │
│  │  - RolesGuard (checks permissions)                   │  │
│  │  - Rate Limiting, Helmet, CORS                       │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │  Services Layer                                       │  │
│  │  - Business Logic                                     │  │
│  │  - Data Validation                                    │  │
│  │  - Email/OTP Generation                              │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │  Repository Layer (TypeORM)                          │  │
│  │  - Database Entities                                  │  │
│  │  - Query Builders                                     │  │
│  └────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────┘
                        │ SQL Queries
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                       │
│  - Users, Roles, Permissions                                │
│  - Purchase Requests, Claims, Files (BYTEA)                 │
│  - Employees, Revenue, Announcements                        │
│  - Audit Logs                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Security Flow Diagram

```
┌──────────────┐
│   User Login │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Validate Credentials    │
│ (Email + Password)      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐      NO      ┌────────────────────┐
│ Argon2 Password Check   │─────────────>│ Increment Failed   │
└──────┬──────────────────┘              │ Login Counter      │
       │ YES                              └────────┬───────────┘
       ▼                                           │
┌─────────────────────────┐                       ▼
│ MFA Enabled?            │              ┌────────────────────┐
└──────┬──────────────────┘              │ Failed >= 5 times? │
       │ YES                              └────────┬───────────┘
       ▼                                           │ YES
┌─────────────────────────┐                       ▼
│ Generate 6-digit OTP    │              ┌────────────────────┐
│ (5-minute expiry)       │              │ Lock Account       │
└──────┬──────────────────┘              │ (60 minutes)       │
       │                                  │ Send Reset Email   │
       ▼                                  └────────────────────┘
┌─────────────────────────┐
│ Send OTP via Email      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ User Enters OTP         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐      NO      ┌────────────────────┐
│ Validate OTP            │─────────────>│ Reject Login       │
└──────┬──────────────────┘              └────────────────────┘
       │ YES
       ▼
┌─────────────────────────┐
│ Check Non-Office Hours? │
└──────┬──────────────────┘
       │ YES (8PM-7AM)
       ▼
┌─────────────────────────┐
│ Send Alert to Admins    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Generate JWT Token      │
│ (Payload: id, email,    │
│  role, permissions)     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Return Access Token     │
│ + User Info to Client   │
└─────────────────────────┘
```

---

## 3. DATABASE SCHEMA

### 3.1 Users Table (Core Authentication)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin', 
        'accountant', 
        'human_resources', 
        'marketing', 
        'sales_department'
    )),
    
    -- Profile Information
    phone VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(255),
    
    -- MFA & Security
    mfa_enabled BOOLEAN DEFAULT TRUE,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP,
    otp_reset VARCHAR(10),
    otp_reset_expires_at TIMESTAMP,
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    suspended BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_password_change TIMESTAMP,
    
    -- Account Lockout
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    -- Audit Trail
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 3.2 Complete ERD Overview

```
users (1) ──────────< (many) purchase_requests
  │                           │
  │                           │
  │                           ▼
  │                    (1) purchase_requests ──< (many) claims
  │
  ├──────< (many) employees
  │
  ├──────< (many) announcements
  │
  ├──────< (many) announcement_comments
  │
  ├──────< (many) revenue (created_by)
  │
  └──────< (many) audit_logs
```

---

## 4. AUTHENTICATION SYSTEM

### 4.1 User Entity (TypeORM)

**File:** `backend/src/users/user.entity.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { Role } from './roles.enum';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Never send password hash to client
  password_hash: string;

  @Column({
    type: 'enum',
    enum: Role,
    nullable: false
  })
  role: Role;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  emergency_contact: string;

  @Column({ default: true })
  mfa_enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_password_change: Date;

  @Column({ nullable: true })
  @Exclude()
  otp_code: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otp_expires_at: Date | null;

  @Column({ nullable: true })
  @Exclude()
  otp_reset: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otp_reset_expires_at: Date | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  suspended: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  @Column({ default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  account_locked_until: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Check if account is currently locked
   */
  isAccountLocked(): boolean {
    if (!this.account_locked_until) return false;
    return new Date() < this.account_locked_until;
  }

  /**
   * Validate OTP code
   */
  isOtpValid(otp: string): boolean {
    if (!this.otp_code || !this.otp_expires_at) return false;
    if (new Date() > this.otp_expires_at) return false;
    return this.otp_code === otp;
  }
}
```

### 4.2 Roles Enum

**File:** `backend/src/users/roles.enum.ts`

```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ACCOUNTANT = 'accountant',
  HR = 'human_resources',
  MARKETING = 'marketing',
  SALES = 'sales_department',
}
```

### 4.3 Authentication Service (Core Logic)

**File:** `backend/src/auth/auth.service.ts`

```typescript
import { 
  Injectable, 
  UnauthorizedException, 
  ForbiddenException 
} from '@nestjs/common';
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
  private readonly OTP_EXPIRY_MINUTES = 5;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 1. USER REGISTRATION
   * Hash password with Argon2id before storing
   */
  async register(email: string, password: string) {
    // Hash password using Argon2 (industry best practice)
    const hash = await argon2.hash(password);
    const now = new Date();
    
    return this.usersService.create({
      email,
      password_hash: hash,
      last_password_change: now,
    });
  }

  /**
   * 2. LOGIN WITH MFA
   * Step 1: Validate credentials and send OTP
   */
  async login(email: string, password: string, req?: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is inactive
    if (user.is_active === false) {
      throw new ForbiddenException({
        message: 'Your account is inactive. Please contact an administrator.',
        inactive: true,
        email: user.email,
      });
    }

    // Check if account is suspended
    if (user.suspended) {
      throw new ForbiddenException({
        message: 'Your account has been suspended. Please contact an administrator.',
        suspended: true,
        email: user.email,
      });
    }

    // Check if account is locked due to failed attempts
    if (user.isAccountLocked()) {
      const isLockoutFlow = !!(
        user.otp_reset && 
        user.otp_reset_expires_at && 
        user.otp_reset_expires_at > new Date()
      ) || !!(
        user.otp_code && 
        user.otp_expires_at && 
        user.otp_expires_at > new Date()
      );
      
      if (isLockoutFlow) {
        throw new UnauthorizedException({
          message: 'Account is locked. Please follow the instructions sent to your email.',
          locked: true,
          email: user.email,
        });
      }
      
      throw new UnauthorizedException({
        message: 'Your account has been suspended. Please contact an administrator.',
        suspended: true,
        email: user.email,
      });
    }

    // Verify password using Argon2
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      return this.handleFailedLogin(user);
    }

    // Reset failed login counter on successful password verification
    user.failed_login_attempts = 0;
    user.account_locked_until = null;

    // If MFA is enabled, send OTP instead of returning token
    if (user.mfa_enabled) {
      const otp = this.generateOtp();
      user.otp_code = otp;
      user.otp_expires_at = this.generateOtpExpiry();
      await this.usersService.create(user);
      await this.sendOtpEmail(user, otp);

      return {
        requiresOtp: true,
        message: 'OTP sent to your email. Please verify to complete login.',
        email: user.email,
      };
    }

    // If MFA disabled, generate JWT directly (not recommended)
    user.last_login_at = new Date();
    await this.usersService.create(user);

    // Check for non-office hours login
    await this.notifyAdminsIfNonOfficeHours(user);

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    return {
      requiresOtp: false,
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
    };
  }

  /**
   * 3. VERIFY OTP (Step 2 of Login)
   */
  async verifyOtp(email: string, otp: string, req?: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if OTP is for password reset
    if (
      user.otp_reset && 
      user.otp_reset_expires_at && 
      user.otp_reset_expires_at > new Date()
    ) {
      if (user.is_active === false) {
        throw new ForbiddenException(
          'Account inactive. Password reset not allowed until reactivated by an administrator.'
        );
      }
      if (user.suspended) {
        throw new ForbiddenException(
          'Account suspended. Password reset not allowed until reactivated by an administrator.'
        );
      }
      
      if (user.otp_reset !== otp) {
        throw new UnauthorizedException('Invalid or expired OTP for password reset');
      }
      
      return {
        message: 'OTP verified. You may now reset your password.',
        resetToken: user.otp_reset,
      };
    }

    // Verify login OTP
    if (!user.isOtpValid(otp)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Clear OTP after successful verification
    user.otp_code = null;
    user.otp_expires_at = null;
    user.last_login_at = new Date();
    await this.usersService.create(user);

    // Check for non-office hours login
    await this.notifyAdminsIfNonOfficeHours(user);

    // Generate JWT token
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
    };
  }

  /**
   * 4. HANDLE FAILED LOGIN ATTEMPTS
   */
  private async handleFailedLogin(user: User) {
    user.failed_login_attempts += 1;

    if (user.failed_login_attempts >= this.MAX_FAILED_ATTEMPTS) {
      // Lock account for 60 minutes
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_DURATION_MINUTES);
      user.account_locked_until = lockUntil;

      // Generate password reset OTP
      const resetOtp = this.generateOtp();
      user.otp_reset = resetOtp;
      user.otp_reset_expires_at = this.generateOtpExpiry();
      
      await this.usersService.create(user);
      
      // Send lockout email with reset instructions
      await this.sendLockoutEmail(user, resetOtp);

      throw new UnauthorizedException({
        message: `Account locked due to ${this.MAX_FAILED_ATTEMPTS} failed login attempts. Password reset OTP sent to your email.`,
        locked: true,
        email: user.email,
      });
    }

    await this.usersService.create(user);
    
    const attemptsRemaining = this.MAX_FAILED_ATTEMPTS - user.failed_login_attempts;
    throw new UnauthorizedException({
      message: `Invalid credentials. ${attemptsRemaining} attempt(s) remaining.`,
      attemptsRemaining,
    });
  }

  /**
   * 5. GENERATE OTP (6-digit code)
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 6. GENERATE OTP EXPIRY (5 minutes from now)
   */
  private generateOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }

  /**
   * 7. SEND OTP EMAIL
   */
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
      subject: isReset ? 'Your Password Reset OTP' : 'Your Login OTP Code',
      html: `
        <h2>${isReset ? 'Password Reset Request' : 'Login Verification'}</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  /**
   * 8. SEND ACCOUNT LOCKOUT EMAIL
   */
  private async sendLockoutEmail(user: User, resetOtp: string) {
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
      subject: 'Account Locked - Password Reset Required',
      html: `
        <h2>Account Security Alert</h2>
        <p>Your account has been locked due to ${this.MAX_FAILED_ATTEMPTS} failed login attempts.</p>
        <p>For security reasons, you must reset your password to unlock your account.</p>
        <p>Your password reset OTP is: <strong>${resetOtp}</strong></p>
        <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not attempt to login, please contact your administrator immediately.</p>
      `,
    });
  }

  /**
   * 9. NON-OFFICE HOURS DETECTION
   */
  private async notifyAdminsIfNonOfficeHours(user: User) {
    const now = new Date();
    const hour = now.getHours();

    // Office hours: 7 AM to 8 PM
    const isOfficeHours = hour >= 7 && hour < 20;

    if (!isOfficeHours) {
      // Get all super admins
      const admins = await this.usersService.findByRole('super_admin');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASS'),
        },
      });

      // Send alert to all super admins
      for (const admin of admins) {
        await transporter.sendMail({
          from: this.configService.get<string>('EMAIL_USER'),
          to: admin.email,
          subject: '🚨 Non-Office Hours Login Alert',
          html: `
            <h2>Security Alert: Non-Office Hours Login</h2>
            <p><strong>User:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Login Time:</strong> ${now.toLocaleString()}</p>
            <p><strong>Status:</strong> Outside office hours (7 AM - 8 PM)</p>
            <p>Please review this activity if it appears suspicious.</p>
          `,
        });
      }
    }
  }

  /**
   * 10. FORGOT PASSWORD
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return { 
        message: 'If an account exists with this email, a password reset OTP has been sent.' 
      };
    }

    const resetOtp = this.generateOtp();
    user.otp_reset = resetOtp;
    user.otp_reset_expires_at = this.generateOtpExpiry();
    await this.usersService.create(user);
    
    await this.sendOtpEmail(user, resetOtp, true);

    return { 
      message: 'If an account exists with this email, a password reset OTP has been sent.' 
    };
  }

  /**
   * 11. VERIFY RESET OTP
   */
  async verifyResetOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    if (
      !user.otp_reset || 
      !user.otp_reset_expires_at || 
      user.otp_reset_expires_at < new Date() || 
      user.otp_reset !== otp
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    return {
      message: 'OTP verified. You may now reset your password.',
      resetToken: user.otp_reset,
    };
  }

  /**
   * 12. RESET PASSWORD
   */
  async resetPassword(
    email: string, 
    otp_reset: string, 
    newPassword: string, 
    confirmPassword: string
  ) {
    if (newPassword !== confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    if (
      !user.otp_reset || 
      !user.otp_reset_expires_at || 
      user.otp_reset_expires_at < new Date() || 
      user.otp_reset !== otp_reset
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password with Argon2
    const hash = await argon2.hash(newPassword);
    
    user.password_hash = hash;
    user.otp_reset = null;
    user.otp_reset_expires_at = null;
    user.failed_login_attempts = 0;
    user.account_locked_until = null;
    user.last_password_change = new Date();
    
    await this.usersService.create(user);

    return { message: 'Password reset successful. You may now login.' };
  }
}
```

---

## 5. AUTHENTICATION CONTROLLER

**File:** `backend/src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/register
   * Register a new user (admin only in production)
   */
  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  /**
   * POST /auth/login
   * Step 1: Validate credentials and send OTP if MFA enabled
   */
  @Post('login')
  async login(
    @Body() body: { email: string; password: string }, 
    @Req() req: Request
  ) {
    return this.authService.login(body.email, body.password, req);
  }

  /**
   * POST /auth/verify-otp
   * Step 2: Verify OTP and return JWT token
   */
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { email: string; otp: string }, 
    @Req() req: Request
  ) {
    return this.authService.verifyOtp(body.email, body.otp, req);
  }

  /**
   * POST /auth/forgot-password
   * Initiate password reset process
   */
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  /**
   * POST /auth/verify-reset-otp
   * Verify password reset OTP
   */
  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyResetOtp(body.email, body.otp);
  }

  /**
   * POST /auth/reset-password
   * Complete password reset with new password
   */
  @Post('reset-password')
  async resetPassword(
    @Body() body: { 
      email: string; 
      otp_reset: string; 
      newPassword: string; 
      confirmPassword: string 
    }
  ) {
    return this.authService.resetPassword(
      body.email, 
      body.otp_reset, 
      body.newPassword, 
      body.confirmPassword
    );
  }
}
```

---

**END OF PART 1**

**Next Part:** RBAC, Guards, Middleware, and API Security
