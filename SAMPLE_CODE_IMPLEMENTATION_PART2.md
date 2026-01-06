# SAMPLE CODE IMPLEMENTATION - PART 2: RBAC, Guards & API Security

**Project:** Zero Trust Access Control System  
**Date:** January 6, 2026  

---

## TABLE OF CONTENTS - PART 2

1. [JWT Strategy & Guards](#jwt-strategy--guards)
2. [Role-Based Access Control (RBAC)](#role-based-access-control)
3. [API Security Middleware](#api-security-middleware)
4. [Backend Main Configuration](#backend-main-configuration)
5. [Key API Endpoints](#key-api-endpoints)

---

## 1. JWT STRATEGY & GUARDS

### 1.1 JWT Strategy Configuration

**File:** `backend/src/auth/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Enforce JWT expiration
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload and return user object
   * This is called on every protected route
   */
  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if account is suspended
    if (user.suspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new UnauthorizedException('Account is locked');
    }

    // Return user object (attached to request.user)
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
```

### 1.2 JWT Auth Guard

**File:** `backend/src/auth/jwt-auth.guard.ts`

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * Validates JWT token on every protected route
 * Usage: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // This will call jwt.strategy.ts validate() method
    return super.canActivate(context);
  }
}
```

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC)

### 2.1 Roles Decorator

**File:** `backend/src/auth/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '../users/roles.enum';

/**
 * Roles Decorator
 * Usage: @Roles(Role.SUPER_ADMIN, Role.ACCOUNTANT)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### 2.2 Roles Guard

**File:** `backend/src/auth/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../users/roles.enum';
import { ROLES_KEY } from './roles.decorator';

/**
 * Roles Guard
 * Checks if user has required role(s) to access endpoint
 * Usage: @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    
    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### 2.3 RBAC Permission Matrix

```typescript
/**
 * ROLE-BASED ACCESS CONTROL MATRIX
 * 
 * 5 Roles in System:
 * 1. SUPER_ADMIN - Full system access
 * 2. ACCOUNTANT - Financial management
 * 3. HR - Employee management
 * 4. MARKETING - Limited access
 * 5. SALES - Limited access
 */

export const PERMISSION_MATRIX = {
  // USER MANAGEMENT
  createUser: [Role.SUPER_ADMIN],
  updateUser: [Role.SUPER_ADMIN],
  deleteUser: [Role.SUPER_ADMIN],
  viewAllUsers: [Role.SUPER_ADMIN, Role.HR],
  suspendUser: [Role.SUPER_ADMIN],
  
  // EMPLOYEE MANAGEMENT
  createEmployee: [Role.SUPER_ADMIN, Role.HR],
  updateEmployee: [Role.SUPER_ADMIN, Role.HR],
  deleteEmployee: [Role.SUPER_ADMIN, Role.HR],
  viewEmployees: [Role.SUPER_ADMIN, Role.HR, Role.ACCOUNTANT],
  
  // PURCHASE REQUESTS
  createPurchaseRequest: [Role.SUPER_ADMIN, Role.MARKETING, Role.SALES],
  viewOwnPurchaseRequest: [Role.SUPER_ADMIN, Role.MARKETING, Role.SALES],
  viewAllPurchaseRequests: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  approvePurchaseRequest: [Role.SUPER_ADMIN],
  rejectPurchaseRequest: [Role.SUPER_ADMIN],
  
  // CLAIMS
  createClaim: [Role.SUPER_ADMIN, Role.MARKETING, Role.SALES],
  viewOwnClaim: [Role.SUPER_ADMIN, Role.MARKETING, Role.SALES],
  viewAllClaims: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  verifyClaim: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  processClaim: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  rejectClaim: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  downloadReceipt: [Role.SUPER_ADMIN, Role.ACCOUNTANT, Role.MARKETING, Role.SALES],
  
  // REVENUE
  createRevenue: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  updateRevenue: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  deleteRevenue: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  viewRevenue: [Role.SUPER_ADMIN, Role.ACCOUNTANT],
  
  // ANNOUNCEMENTS
  createAnnouncement: [Role.SUPER_ADMIN, Role.HR],
  updateAnnouncement: [Role.SUPER_ADMIN, Role.HR],
  deleteAnnouncement: [Role.SUPER_ADMIN, Role.HR],
  viewAnnouncements: [Role.SUPER_ADMIN, Role.HR, Role.ACCOUNTANT, Role.MARKETING, Role.SALES],
  
  // AUDIT LOGS
  viewAuditLogs: [Role.SUPER_ADMIN],
};
```

### 2.4 Example: Protected Endpoint with RBAC

```typescript
import { 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/roles.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards to all routes
export class UsersController {
  
  /**
   * GET /users
   * Only SUPER_ADMIN and HR can view all users
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.HR)
  async findAll() {
    // Implementation
  }

  /**
   * POST /users
   * Only SUPER_ADMIN can create users
   */
  @Post()
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    // Implementation
  }

  /**
   * GET /users/me
   * Any authenticated user can view their own profile
   */
  @Get('me')
  async getProfile(@Request() req) {
    const userId = req.user.userId;
    // Return user's own data
  }
}
```

---

## 3. API SECURITY MIDDLEWARE

### 3.1 Main Application Bootstrap

**File:** `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable trust proxy to get real client IP behind Nginx/reverse proxy
  app.set('trust proxy', 1);

  /**
   * PRODUCTION-READY CORS Configuration
   * 
   * Architecture:
   * - Browser → http://<public-ip>:3001 (Next.js frontend)
   * - Next.js → http://localhost:3000 (NestJS backend, via proxy)
   * 
   * CORS Strategy:
   * - Backend only allows requests from localhost:3001 (the Next.js server)
   * - Frontend uses relative paths (/api/*), proxied by Next.js
   * - No hardcoded IPs needed - works after every EC2 restart
   */
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  console.log('🔒 CORS enabled for origin:', frontendUrl);
  
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Seed Super Admin (environment-based credentials)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'defaultPassword123';
  
  const usersService = app.get(UsersService);
  await usersService.createSuperAdmin(adminEmail, adminPassword);
  console.log('✅ Super Admin created or already exists.');

  // PRODUCTION: Bind to 0.0.0.0 (all interfaces)
  // DEVELOPMENT: Bind to 127.0.0.1 (localhost only)
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  
  await app.listen(port, host);
  console.log(`🚀 Backend running on http://${host}:${port}`);
  console.log(`📡 Accessible via Next.js proxy at <frontend-url>/api/*`);
}

bootstrap();
```

### 3.2 App Module Configuration

**File:** `backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Import all modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { EmployeesModule } from './employees/employees.module';
import { RevenueModule } from './revenue/revenue.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Environment Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // PostgreSQL Database Connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production', // Disable in production
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // JWT Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: '24h' // Token expires in 24 hours
        },
      }),
    }),

    // Passport for authentication strategies
    PassportModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    PurchaseRequestsModule,
    EmployeesModule,
    RevenueModule,
    AnnouncementsModule,
    AuditModule,
  ],
})
export class AppModule {}
```

### 3.3 Environment Variables

**File:** `backend/.env`

```bash
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_DATABASE=fyp_system

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf,.doc,.docx

# ClamAV (Malware Scanning)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

---

## 4. KEY API ENDPOINTS

### 4.1 Authentication Endpoints

```typescript
/**
 * BASE URL: /auth
 * Authentication is NOT required for these endpoints
 */

// POST /auth/register
// Register new user account
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

// POST /auth/login
// Step 1: Login with credentials
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
// Response if MFA enabled:
{
  "requiresOtp": true,
  "message": "OTP sent to your email",
  "email": "user@example.com"
}

// POST /auth/verify-otp
// Step 2: Verify OTP code
{
  "email": "user@example.com",
  "otp": "123456"
}
// Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "marketing"
  }
}

// POST /auth/forgot-password
// Initiate password reset
{
  "email": "user@example.com"
}

// POST /auth/verify-reset-otp
// Verify reset OTP
{
  "email": "user@example.com",
  "otp": "123456"
}

// POST /auth/reset-password
// Complete password reset
{
  "email": "user@example.com",
  "otp_reset": "123456",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

### 4.2 User Management Endpoints

```typescript
/**
 * BASE URL: /users
 * Requires JWT Authentication
 */

// GET /users
// Get all users (SUPER_ADMIN, HR only)
// Headers: { Authorization: "Bearer <token>" }

// POST /users
// Create new user (SUPER_ADMIN only)
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "role": "marketing",
  "phone": "+1234567890",
  "address": "123 Main St"
}

// PATCH /users/:id
// Update user (SUPER_ADMIN only)
{
  "phone": "+9876543210",
  "address": "456 New St"
}

// DELETE /users/:id
// Soft delete user (SUPER_ADMIN only)

// PATCH /users/:id/suspend
// Suspend user account (SUPER_ADMIN only)

// PATCH /users/:id/activate
// Activate user account (SUPER_ADMIN only)

// GET /users/me
// Get current user profile (Any authenticated user)
```

### 4.3 Purchase Request Endpoints

```typescript
/**
 * BASE URL: /purchase-requests
 * Requires JWT Authentication
 */

// POST /purchase-requests
// Create new purchase request (MARKETING, SALES, SUPER_ADMIN)
{
  "title": "Marketing Campaign Budget",
  "description": "Q1 2026 digital marketing campaign",
  "department": "marketing",
  "priority": 3,
  "estimated_amount": 5000.00
}

// GET /purchase-requests
// Get all purchase requests
// - SUPER_ADMIN, ACCOUNTANT: See all
// - MARKETING, SALES: See only own requests

// GET /purchase-requests/:id
// Get specific purchase request details

// PATCH /purchase-requests/:id/submit
// Submit draft for review

// PATCH /purchase-requests/:id/approve
// Approve request (SUPER_ADMIN only)
{
  "approved_amount": 4500.00,
  "review_notes": "Approved with budget adjustment"
}

// PATCH /purchase-requests/:id/reject
// Reject request (SUPER_ADMIN only)
{
  "review_notes": "Insufficient justification"
}
```

### 4.4 Claims Endpoints

```typescript
/**
 * BASE URL: /purchase-requests/:prId/claims
 * Requires JWT Authentication + MFA for receipt download
 */

// POST /purchase-requests/:prId/claims
// Submit new claim with receipt
// Content-Type: multipart/form-data
{
  "vendor_name": "Office Supplies Inc",
  "amount_claimed": 250.50,
  "purchase_date": "2026-01-05",
  "claim_description": "Office supplies for campaign",
  "receipt": <File>
}

// GET /purchase-requests/:prId/claims
// Get all claims for a purchase request

// GET /claims/:id
// Get specific claim details

// PATCH /claims/:id/verify
// Verify claim (ACCOUNTANT, SUPER_ADMIN)
{
  "verification_notes": "Receipt verified, amount approved"
}

// PATCH /claims/:id/process
// Mark claim as processed/paid (ACCOUNTANT, SUPER_ADMIN)

// PATCH /claims/:id/reject
// Reject claim (ACCOUNTANT, SUPER_ADMIN)
{
  "verification_notes": "Invalid receipt"
}

// GET /claims/:id/receipt
// Download receipt file (requires MFA session)
// Headers: { 
//   Authorization: "Bearer <token>",
//   X-MFA-Session: "true"
// }
```

### 4.5 Revenue Endpoints

```typescript
/**
 * BASE URL: /revenue
 * Requires JWT Authentication
 * Only SUPER_ADMIN and ACCOUNTANT can access
 */

// GET /revenue
// Get all revenue records

// POST /revenue
// Create new revenue record
{
  "source": "Product Sales",
  "amount": 15000.00,
  "date": "2026-01-05",
  "description": "January sales revenue",
  "category": "Sales"
}

// PATCH /revenue/:id
// Update revenue record

// DELETE /revenue/:id
// Delete revenue record

// GET /revenue/summary
// Get revenue summary/statistics
```

### 4.6 Employee Endpoints

```typescript
/**
 * BASE URL: /employees
 * Requires JWT Authentication
 * Only HR and SUPER_ADMIN can manage
 */

// GET /employees
// Get all employees

// POST /employees
// Create new employee
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1234567890",
  "position": "Marketing Manager",
  "department": "Marketing",
  "hire_date": "2026-01-01",
  "salary": 75000.00
}

// GET /employees/:id
// Get employee details

// PATCH /employees/:id
// Update employee information

// DELETE /employees/:id
// Delete employee record
```

---

## 5. REQUEST/RESPONSE EXAMPLES

### 5.1 Complete Login Flow with MFA

**Step 1: Initial Login**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "requiresOtp": true,
  "message": "OTP sent to your email. Please verify to complete login.",
  "email": "user@example.com"
}
```

**Step 2: Verify OTP**
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hcmtldGluZyIsImlhdCI6MTcwNDU1NTYwMCwiZXhwIjoxNzA0NjQyMDAwfQ.signature",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "marketing"
  }
}
```

### 5.2 Making Authenticated Requests

**All subsequent requests include JWT token:**
```bash
curl -X GET http://localhost:3000/purchase-requests \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5.3 Error Responses

**Account Locked:**
```json
{
  "statusCode": 401,
  "message": "Account locked due to 5 failed login attempts. Password reset OTP sent to your email.",
  "locked": true,
  "email": "user@example.com"
}
```

**Insufficient Permissions:**
```json
{
  "statusCode": 403,
  "message": "Forbidden: Insufficient permissions"
}
```

**Invalid JWT:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

**END OF PART 2**

**Next Part:** File Upload Security, Database Models, and Frontend Implementation
