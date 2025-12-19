import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // PRODUCTION-READY CORS: Support multiple origins (with and without port)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  // Build allowed origins list: include both with port 3001 and without port
  const allowedOrigins: string[] = [];
  
  // Add the configured frontend URL
  allowedOrigins.push(frontendUrl);
  
  // If frontend URL doesn't have port 3001, add it
  if (!frontendUrl.includes(':3001')) {
    allowedOrigins.push(`${frontendUrl.replace(/\/$/, '')}:3001`);
  }
  
  // Always allow localhost for development
  if (!frontendUrl.includes('localhost')) {
    allowedOrigins.push('http://localhost:3001');
  }
  
  console.log('🔒 CORS enabled for origins:', allowedOrigins);
  
  app.enableCors({
    origin: allowedOrigins,
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

  // PRODUCTION-READY: Bind to 0.0.0.0 for EC2 deployment
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
