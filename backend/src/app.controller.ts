import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint for ALB/Load Balancer
   * Returns basic health status
   */
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend',
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness check endpoint for ALB/Load Balancer
   * Can be extended to check database connectivity, etc.
   */
  @Get('health/ready')
  getReadiness() {
    // TODO: Add database connection check if needed
    // const dbConnected = await this.connection.query('SELECT 1');
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'not-implemented', // Add actual check in production
      },
    };
  }
}
