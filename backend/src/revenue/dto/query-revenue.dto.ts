import { IsOptional, IsDateString, IsIn, IsString, MaxLength } from 'class-validator';

/**
 * DTO for querying revenue records
 * 
 * Supports filtering by:
 * - Date range (start_date, end_date)
 * - Client name
 * - Status (PAID/PENDING)
 * - Source/category
 */
export class QueryRevenueDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  client?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PAID', 'PENDING'])
  status?: 'PAID' | 'PENDING';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
