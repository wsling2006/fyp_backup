import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, Max, IsDecimal, MaxLength } from 'class-validator';
import { PurchaseRequestPriority } from './purchase-request.entity';

export class CreatePurchaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  priority: number;

  @IsNumber()
  @Min(0)
  estimated_amount: number;

  @IsOptional()
  @IsString()
  otp?: string;
}

export class UpdatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number;

  @IsOptional()
  @IsString()
  otp?: string;
}

export class ReviewPurchaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['APPROVED', 'REJECTED', 'UNDER_REVIEW'])
  status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';

  @IsOptional()
  @IsString()
  review_notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approved_amount?: number;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  purchase_request_id: string;

  @IsString()
  @IsNotEmpty()
  vendor_name: string;

  @IsNumber()
  @Min(0)
  amount_claimed: number;

  @IsString()
  @IsNotEmpty()
  purchase_date: string;

  @IsString()
  @IsNotEmpty()
  claim_description: string;

  // OTP removed: Users can now upload claims without OTP verification
  // This simplifies the claim upload process and removes unnecessary friction
}

export class VerifyClaimDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['VERIFIED', 'PROCESSED', 'REJECTED'])
  status: 'VERIFIED' | 'PROCESSED' | 'REJECTED';

  @IsOptional()
  @IsString()
  verification_notes?: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class EditPurchaseRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_amount?: number;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class EditClaimDto {
  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_claimed?: number;

  @IsOptional()
  @IsString()
  purchase_date?: string;

  @IsOptional()
  @IsString()
  claim_description?: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
