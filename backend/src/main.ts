import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend at port 3001
  app.enableCors({
    origin: 'http://localhost:3001', // frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true, // if you want cookies/auth headers
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Seed Super Admin for testing
  const usersService = app.get(UsersService);
  await usersService.createSuperAdmin(
    'leejingwei123@gmail.com',
    'ctxd dlkq khkx kpwk',
  );
  console.log('Super Admin created or already exists.');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
