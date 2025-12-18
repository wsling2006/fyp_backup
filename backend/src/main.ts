import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // PRODUCTION-READY CORS: Use environment variable for frontend URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
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

  // PRODUCTION-READY: Bind to 0.0.0.0 for EC2 deployment
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
