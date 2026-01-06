# SAMPLE CODE IMPLEMENTATION - PART 3: File Security & Frontend

**Project:** Zero Trust Access Control System  
**Date:** January 6, 2026  

---

## TABLE OF CONTENTS - PART 3

1. [File Upload Security System](#file-upload-security-system)
2. [Database Entities](#database-entities)
3. [Frontend Architecture](#frontend-architecture)
4. [Frontend Authentication](#frontend-authentication)
5. [Frontend Components](#frontend-components)

---

## 1. FILE UPLOAD SECURITY SYSTEM

### 1.1 Claim Entity with File Storage

**File:** `backend/src/purchase-requests/claim.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { PurchaseRequest } from './purchase-request.entity';

export enum ClaimStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

export enum MalwareScanStatus {
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  purchase_request_id: string;

  @ManyToOne(() => PurchaseRequest, (pr) => pr.claims)
  @JoinColumn({ name: 'purchase_request_id' })
  purchaseRequest: PurchaseRequest;

  // File metadata
  @Column({ type: 'varchar', length: 500 })
  receipt_file_path: string;

  @Column({ type: 'varchar', length: 500 })
  receipt_file_original_name: string;

  // Store file data in database (BYTEA - secure storage)
  @Column({ type: 'bytea', nullable: true })
  receipt_file_data: Buffer;

  @Column({ type: 'bigint', nullable: true })
  receipt_file_size: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  receipt_file_mimetype: string;

  // SHA-256 hash to prevent duplicate uploads
  @Column({ type: 'varchar', length: 64, nullable: true })
  file_hash: string;

  // Malware scan status
  @Column({
    type: 'varchar',
    length: 20,
    default: MalwareScanStatus.CLEAN,
  })
  malware_scan_status: MalwareScanStatus;

  // Claim information
  @Column({ type: 'varchar', length: 255 })
  vendor_name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount_claimed: number;

  @Column({ type: 'date' })
  purchase_date: Date;

  @Column({ type: 'text' })
  claim_description: string;

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  @Column({ type: 'uuid', nullable: true })
  verified_by_user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_user_id' })
  verifiedBy: User;

  @Column({ type: 'text', nullable: true })
  verification_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  @CreateDateColumn()
  uploaded_at: Date;
}
```

### 1.2 ClamAV Malware Scanning Service

**File:** `backend/src/clamav/clamav.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class ClamAVService {
  private readonly logger = new Logger(ClamAVService.name);
  private readonly CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost';
  private readonly CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310');

  /**
   * Scan file buffer for malware using ClamAV
   * Returns true if file is clean, false if infected
   */
  async scanBuffer(buffer: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let response = '';

      client.connect(this.CLAMAV_PORT, this.CLAMAV_HOST, () => {
        // Send INSTREAM command
        client.write('zINSTREAM\0');

        // Send file data in chunks
        const chunkSize = 1024;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(chunk.length, 0);
          client.write(sizeBuffer);
          client.write(chunk);
        }

        // Send zero-length chunk to signal end
        const endBuffer = Buffer.alloc(4);
        endBuffer.writeUInt32BE(0, 0);
        client.write(endBuffer);
      });

      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        client.destroy();
        
        if (response.includes('OK')) {
          this.logger.log('File scan: CLEAN');
          resolve(true);
        } else if (response.includes('FOUND')) {
          this.logger.warn('File scan: INFECTED');
          resolve(false);
        } else {
          this.logger.error(`ClamAV error: ${response}`);
          reject(new Error('ClamAV scan error'));
        }
      });

      client.on('error', (err) => {
        this.logger.error(`ClamAV connection error: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Ping ClamAV to check if service is running
   */
  async ping(): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      client.connect(this.CLAMAV_PORT, this.CLAMAV_HOST, () => {
        client.write('zPING\0');
      });

      client.on('data', (data) => {
        const response = data.toString();
        client.destroy();
        resolve(response.includes('PONG'));
      });

      client.on('error', () => {
        resolve(false);
      });

      client.setTimeout(5000, () => {
        client.destroy();
        resolve(false);
      });
    });
  }
}
```

### 1.3 File Upload Service with Security

**File:** `backend/src/purchase-requests/purchase-request.service.ts` (excerpt)

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim, MalwareScanStatus } from './claim.entity';
import { ClamAVService } from '../clamav/clamav.service';
import * as crypto from 'crypto';

@Injectable()
export class PurchaseRequestService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    @InjectRepository(Claim)
    private claimRepository: Repository<Claim>,
    private clamavService: ClamAVService,
  ) {}

  /**
   * Upload claim with receipt file
   * Implements multiple security layers
   */
  async uploadClaim(
    purchaseRequestId: string,
    userId: string,
    claimData: any,
    file: Express.Multer.File,
  ) {
    // SECURITY LAYER 1: File size validation
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // SECURITY LAYER 2: MIME type validation
    if (!this.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.ALLOWED_MIMETYPES.join(', ')}`
      );
    }

    // SECURITY LAYER 3: Calculate SHA-256 hash for deduplication
    const fileHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Check if file already exists (deduplication)
    const existingFile = await this.claimRepository.findOne({
      where: { file_hash: fileHash },
    });

    if (existingFile) {
      throw new BadRequestException(
        'This file has already been uploaded previously'
      );
    }

    // SECURITY LAYER 4: ClamAV malware scanning
    let scanStatus = MalwareScanStatus.PENDING;
    try {
      const isClean = await this.clamavService.scanBuffer(file.buffer);
      scanStatus = isClean ? MalwareScanStatus.CLEAN : MalwareScanStatus.INFECTED;
      
      if (!isClean) {
        throw new BadRequestException(
          'File failed malware scan. Upload rejected for security reasons.'
        );
      }
    } catch (error) {
      scanStatus = MalwareScanStatus.ERROR;
      throw new BadRequestException(
        'Unable to scan file for malware. Please try again later.'
      );
    }

    // SECURITY LAYER 5: Store file in database (BYTEA)
    const claim = this.claimRepository.create({
      purchase_request_id: purchaseRequestId,
      uploaded_by_user_id: userId,
      vendor_name: claimData.vendor_name,
      amount_claimed: claimData.amount_claimed,
      purchase_date: claimData.purchase_date,
      claim_description: claimData.claim_description,
      receipt_file_path: file.originalname, // Legacy field
      receipt_file_original_name: file.originalname,
      receipt_file_data: file.buffer, // Store in database
      receipt_file_size: file.size,
      receipt_file_mimetype: file.mimetype,
      file_hash: fileHash,
      malware_scan_status: scanStatus,
    });

    return await this.claimRepository.save(claim);
  }

  /**
   * Download receipt file (requires MFA session)
   */
  async downloadReceipt(claimId: string, userId: string, userRole: string) {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['uploadedBy', 'purchaseRequest'],
    });

    if (!claim) {
      throw new BadRequestException('Claim not found');
    }

    // Check permissions
    const canAccess = 
      userRole === 'super_admin' ||
      userRole === 'accountant' ||
      claim.uploaded_by_user_id === userId;

    if (!canAccess) {
      throw new BadRequestException('Access denied');
    }

    // Return file buffer
    return {
      buffer: claim.receipt_file_data,
      originalName: claim.receipt_file_original_name,
      mimeType: claim.receipt_file_mimetype,
      size: claim.receipt_file_size,
    };
  }
}
```

### 1.4 File Upload Controller

**File:** `backend/src/purchase-requests/purchase-request.controller.ts` (excerpt)

```typescript
import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Request,
  Response,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';
import { PurchaseRequestService } from './purchase-request.service';
import { Response as ExpressResponse } from 'express';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequestController {
  constructor(private service: PurchaseRequestService) {}

  /**
   * POST /purchase-requests/:id/claims
   * Upload claim with receipt file
   */
  @Post(':id/claims')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING, Role.SALES)
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    })
  )
  async uploadClaim(
    @Param('id') prId: string,
    @Request() req,
    @Body() claimData: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }

    return this.service.uploadClaim(
      prId,
      req.user.userId,
      claimData,
      file
    );
  }

  /**
   * GET /claims/:id/receipt
   * Download receipt file (requires MFA session)
   */
  @Get('/claims/:id/receipt')
  @Roles(Role.SUPER_ADMIN, Role.ACCOUNTANT, Role.MARKETING, Role.SALES)
  async downloadReceipt(
    @Param('id') claimId: string,
    @Request() req,
    @Response() res: ExpressResponse,
  ) {
    const fileData = await this.service.downloadReceipt(
      claimId,
      req.user.userId,
      req.user.role
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileData.originalName}"`
    );
    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Length', fileData.size);
    
    res.send(fileData.buffer);
  }
}
```

---

## 2. DATABASE ENTITIES

### 2.1 Purchase Request Entity

**File:** `backend/src/purchase-requests/purchase-request.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PurchaseRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum PurchaseRequestPriority {
  NORMAL = 1,
  MEDIUM = 2,
  HIGH = 3,
  VERY_HIGH = 4,
  URGENT = 5,
}

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  department: string; // sales_department, marketing

  @Column({ type: 'int', default: 1 })
  priority: number; // 1-5

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  estimated_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  approved_amount: number;

  @Column({
    type: 'enum',
    enum: PurchaseRequestStatus,
    default: PurchaseRequestStatus.DRAFT,
  })
  status: PurchaseRequestStatus;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by_user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy: User;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  // Financial tracking columns
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    default: 0,
  })
  total_claimed?: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    default: 0,
  })
  total_paid?: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    default: 0,
  })
  total_rejected?: number;

  @Column({
    type: 'int',
    nullable: true,
    default: 0,
  })
  payment_progress?: number; // 0-100%

  @OneToMany('Claim', 'purchaseRequest')
  claims: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 2.2 Employee Entity

**File:** `backend/src/employees/employee.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100 })
  position: string;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'date' })
  hire_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salary: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 2.3 Revenue Entity

**File:** `backend/src/revenue/revenue.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('revenue')
export class Revenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  source: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 2.4 Announcement Entity

**File:** `backend/src/announcements/entities/announcement.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum AnnouncementPriority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.NORMAL,
  })
  priority: AnnouncementPriority;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @OneToMany('AnnouncementComment', 'announcement')
  comments: any[];

  @OneToMany('AnnouncementAcknowledgment', 'announcement')
  acknowledgments: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Project Structure

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   ├── login/                   # Login pages
│   │   └── page.tsx
│   ├── verify-otp/              # OTP verification
│   │   └── page.tsx
│   ├── dashboard/               # Dashboard
│   │   └── page.tsx
│   ├── purchase-requests/       # Purchase request pages
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   └── create/
│   ├── employees/               # Employee management
│   ├── revenue/                 # Revenue management
│   └── user-management/         # User management
├── components/                   # Reusable components
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   ├── ProtectedRoute.tsx
│   └── ui/                      # UI components
├── context/                      # React Context
│   └── AuthContext.tsx
├── lib/                          # Utilities
│   ├── api.ts                   # API client
│   └── utils.ts
├── public/                       # Static files
└── package.json
```

### 3.2 API Client Configuration

**File:** `frontend/lib/api.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 4. FRONTEND AUTHENTICATION

### 4.1 Auth Context

**File:** `frontend/context/AuthContext.tsx`

```typescript
'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    const { access_token, user } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 4.2 Protected Route Component

**File:** `frontend/components/ProtectedRoute.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
        router.push('/dashboard'); // Redirect to dashboard if insufficient permissions
      }
    }
  }, [loading, isAuthenticated, user, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 5. FRONTEND COMPONENTS

### 5.1 Login Page

**File:** `frontend/app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      
      if (response.requiresOtp) {
        // Redirect to OTP verification
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        // Direct login (MFA disabled)
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Sign in to your account
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 5.2 OTP Verification Page

**File:** `frontend/app/verify-otp/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { verifyOtp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otp);
      // AuthContext will handle redirect to dashboard
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Invalid or expired OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Verify OTP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code sent to {email}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="000000"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

**END OF PART 3**

**Next Part:** Dashboard, Purchase Requests UI, and Deployment Guide
