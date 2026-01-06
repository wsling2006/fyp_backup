import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security: Enable Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
  }));

  // Enable trust proxy to get real client IP behind ALB/reverse proxy
  // This allows Express to trust X-Forwarded-* headers from ALB
  app.set('trust proxy', 1);

  // Log ALB headers for debugging (can be removed after deployment is stable)
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      console.log('[ALB Headers]', {
        proto: req.headers['x-forwarded-proto'],
        for: req.headers['x-forwarded-for'],
        port: req.headers['x-forwarded-port'],
        host: req.headers['host'],
        origin: req.headers['origin'],
      });
      next();
    });
  }

  /**
   * PRODUCTION-READY CORS for ALB with HTTPS
   * 
   * Architecture:
   * - Browser → https://yourdomain.com (ALB HTTPS:443)
   * - ALB → http://localhost:3001 (Next.js frontend on EC2)
   * - Next.js → http://localhost:3000 (NestJS backend via proxy)
   * 
   * CORS Strategy:
   * - Backend accepts requests from:
   *   1. localhost:3001 (Next.js server-side proxy)
   *   2. Public HTTPS domain (for direct API calls if needed)
   * - Frontend uses relative paths (/api/*), proxied by Next.js
   * - Works with EC2 restarts AND ALB deployment
   */
  
  // Define allowed origins for CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3001',  // Next.js proxy (internal)
    process.env.PUBLIC_DOMAIN,                             // ALB public domain (external)
    'http://localhost:3001',                               // Development/fallback
  ].filter(Boolean); // Remove undefined values
  
  console.log('🔒 CORS enabled for origins:', allowedOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-For', 'X-Real-IP'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Seed Super Admin (environment-based credentials)
  const adminEmail = process.env.ADMIN_EMAIL || 'leejingwei123@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ctxd dlkq khkx kpwk';
  
  const usersService = app.get(UsersService);
  await usersService.createSuperAdmin(adminEmail, adminPassword);
  console.log('Super Admin created or already exists.');

  // PRODUCTION-READY: Bind to appropriate interface based on environment
  // - Production (EC2): 0.0.0.0 (all interfaces, accessed via Next.js proxy)
  // - Development: 127.0.0.1 (localhost only)
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen(port, host);
  console.log(`🚀 Backend running on http://${host}:${port}`);
  console.log(`📡 Accessible via Next.js proxy at <frontend-url>/api/*`);
  console.log(`🔒 CORS origins:`, allowedOrigins);

  // Graceful shutdown for ALB connection draining
  process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, closing server gracefully...');
    await app.close();
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT received, closing server gracefully...');
    await app.close();
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
}
bootstrap();
