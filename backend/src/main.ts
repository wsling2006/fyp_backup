import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable trust proxy to get real client IP behind Nginx/reverse proxy
  app.set('trust proxy', 1);

  /**
   * PRODUCTION-READY CORS with Same-Origin Architecture
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
  const adminEmail = process.env.ADMIN_EMAIL || 'leejingwei123@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ctxd dlkq khkx kpwk';
  
  const usersService = app.get(UsersService);
  await usersService.createSuperAdmin(adminEmail, adminPassword);
  console.log('Super Admin created or already exists.');

  // PRODUCTION-READY: Bind to localhost only (accessed via Next.js proxy)
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, 'localhost');
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📡 Accessible via Next.js proxy at <frontend-url>/api/*`);
}
bootstrap();
