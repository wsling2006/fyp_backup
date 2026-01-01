import { IsString, IsNumber, IsDateString, IsOptional, IsIn, MaxLength, Min } from 'class-validator';

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
   * Minimum: 1 cent = $0.01
   */
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Amount must be at least $0.01 (1 cent)' })
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
