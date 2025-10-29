import { IsArray, IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  orderImageUrls?: string[];

  // Optional linkage to Firebase user
  @IsOptional()
  @IsString()
  firebaseUid?: string;

  // Optional last order date (ISO string)
  @IsOptional()
  @IsDateString()
  lastOrderAt?: string;
}
