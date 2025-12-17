import { Module } from '@nestjs/common';
import { ClamavService } from './clamav.service';

/**
 * ClamAV Module
 * 
 * Provides malware scanning capabilities for the application.
 * This module can be imported by any feature module that needs file scanning.
 * 
 * For FYP: This demonstrates the modular architecture of NestJS and separation
 * of concerns - security scanning logic is isolated in its own module.
 */
@Module({
  providers: [ClamavService],
  exports: [ClamavService], // Export so other modules can use it
})
export class ClamavModule {}
