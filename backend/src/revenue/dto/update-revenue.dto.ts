import { IsString, IsNumber, IsDateString, IsOptional, IsIn, MaxLength } from 'class-validator';

/**
 * DTO for updating a revenue record
 * 
 * All fields are optional to allow partial updates.
 * Validation rules match CreateRevenueDto for consistency.
 */
export class UpdateRevenueDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoice_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  client?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  /**
   * Amount in cents (e.g., 10000 = $100.00)
   * Prevents floating point precision issues
   */
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PAID', 'PENDING'])
  status?: 'PAID' | 'PENDING';

  @IsOptional()
  @IsString()
  notes?: string;
}
