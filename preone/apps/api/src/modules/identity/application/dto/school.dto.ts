/**
 * School DTOs — request/response shapes for /v1/schools/* endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, Matches, IsOptional,
  IsEnum, IsInt, Min, Max,
} from 'class-validator';

export enum SchoolStatusDto {
  PROSPECT = 'PROSPECT',
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum SchoolTierDto {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateSchoolDto {
  @ApiProperty({ example: 'Little Stars Preschool' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Little Stars Education Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiProperty({ example: 'owner@littlestars.in' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone!: string;

  @ApiPropertyOptional({ example: 'https://littlestars.in' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: '27ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstNumber must be a valid 15-char GSTIN',
  })
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'panNumber must be a valid 10-char PAN' })
  panNumber?: string;

  @ApiProperty({ enum: SchoolTierDto, default: SchoolTierDto.STARTER })
  @IsEnum(SchoolTierDto)
  tier!: SchoolTierDto;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Max branches allowed for this tier' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 100, default: 100, description: 'Student seat cap' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  studentSeats?: number;

  @ApiPropertyOptional({ default: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: 'en-IN' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'ISO date when trial ends (default +14 days)' })
  @IsOptional()
  @IsString()
  trialEndsAt?: string;
}

export class UpdateSchoolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstNumber must be a valid 15-char GSTIN',
  })
  gstNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'panNumber must be a valid 10-char PAN' })
  panNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;
}

export class SuspendSchoolDto {
  @ApiProperty({ example: 'Payment overdue 30+ days' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class ListSchoolsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({ enum: SchoolStatusDto })
  @IsOptional()
  @IsEnum(SchoolStatusDto)
  status?: SchoolStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class SchoolResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  gstNumber?: string;

  @ApiPropertyOptional()
  panNumber?: string;

  @ApiProperty({ enum: SchoolStatusDto })
  status!: SchoolStatusDto;

  @ApiProperty({ enum: SchoolTierDto })
  tier!: SchoolTierDto;

  @ApiProperty()
  branchCount!: number;

  @ApiProperty()
  maxBranches!: number;

  @ApiProperty()
  studentSeats!: number;

  @ApiProperty()
  usedSeats!: number;

  @ApiProperty()
  seatsAvailable!: number;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  locale!: string;

  @ApiPropertyOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional()
  activatedAt?: string;

  @ApiPropertyOptional()
  suspendedAt?: string;

  @ApiPropertyOptional()
  cancelledAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
