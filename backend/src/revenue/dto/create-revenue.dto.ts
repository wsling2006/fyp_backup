import { IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString, IsOptional, IsIn, MaxLength, Min } from 'class-validator';

/**
 * DTO for creating a new revenue record
 * 
 * Validation ensures:
 * - Required fields are present
 * - Amount is positive (minimum 1 cent = $0.01)
 * - Status is valid enum
 * - Date is valid ISO format
 */
export class CreateRevenueDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoice_id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  client: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  source: string;

  /**
   * Amount in cents (e.g., 10000 = $100.00)
   * Prevents floating point precision issues
   * Minimum: 1 cent = $0.01
   */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1, { message: 'Amount must be at least $0.01 (1 cent)' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['PAID', 'PENDING'])
  status: 'PAID' | 'PENDING';

  @IsOptional()
  @IsString()
  notes?: string;
}
