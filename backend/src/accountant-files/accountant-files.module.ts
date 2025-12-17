import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountantFile } from './accountant-file.entity';
import { AccountantFilesService } from './accountant-files.service';
import { AccountantFilesController } from './accountant-files.controller';
import { ClamavModule } from '../clamav/clamav.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountantFile]),
    ClamavModule, // Import ClamAV module for malware scanning
  ],
  providers: [AccountantFilesService],
  controllers: [AccountantFilesController],
})
export class AccountantFilesModule {}
