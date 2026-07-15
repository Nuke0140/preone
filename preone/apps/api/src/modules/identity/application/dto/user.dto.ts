/**
 * User DTOs — request/response shapes for /v1/users/* endpoints.
 *
 * Per BTD §8 — DTOs use class-validator decorators + Swagger.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, Matches, IsOptional,
  IsArray, IsUUID, IsEnum, IsInt, Min, Max, ValidateNested,
} from 'class-validator';

export enum UserStatusDto {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export class CreateUserDto {
  @ApiProperty({ example: 'owner@school.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone?: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'Priya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.preone.in/avatars/priya.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'BR-001', description: 'Branch code' })
  @IsOptional()
  @IsString()
  branchCode?: string;

  @ApiProperty({ example: ['SCHOOL_ADMIN'], description: 'Role codes' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  roles!: string[];

  @ApiPropertyOptional({ enum: UserStatusDto, default: UserStatusDto.PENDING })
  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatusDto })
  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchCode?: string;
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class ChangeUserRolesDto {
  @ApiProperty({ example: ['SCHOOL_ADMIN', 'ACCOUNTS'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  roleCodes!: string[];
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatusDto })
  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: 'SCHOOL_ADMIN' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: UserStatusDto })
  status!: UserStatusDto;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty()
  permissionsVersion!: number;

  @ApiPropertyOptional()
  branchId?: string;

  @ApiPropertyOptional()
  lastLoginAt?: string;

  @ApiPropertyOptional()
  emailVerifiedAt?: string;

  @ApiPropertyOptional()
  phoneVerifiedAt?: string;

  @ApiPropertyOptional()
  mfaEnabled?: boolean;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  hasNext!: boolean;
}
