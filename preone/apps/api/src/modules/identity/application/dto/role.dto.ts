/**
 * Role DTOs — request/response shapes for /v1/roles/* endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString, MinLength, MaxLength, IsNotEmpty, IsOptional,
  IsArray, IsEnum, IsInt, Min, Max, IsBoolean, Matches,
} from 'class-validator';

export enum RoleScopeDto {
  PLATFORM = 'PLATFORM',
  TENANT = 'TENANT',
  BRANCH = 'BRANCH',
  CLASSROOM = 'CLASSROOM',
}

export class CreateRoleDto {
  @ApiProperty({ example: 'CURRICULUM_LEAD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'code must be UPPER_SNAKE_CASE' })
  code!: string;

  @ApiProperty({ example: 'Curriculum Lead' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Owns curriculum design across branch' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: RoleScopeDto, default: RoleScopeDto.TENANT })
  @IsEnum(RoleScopeDto)
  scope!: RoleScopeDto;

  @ApiPropertyOptional({ example: '#7C3AED' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex color like #RRGGBB' })
  color?: string;

  @ApiPropertyOptional({ example: 50, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  sortOrder?: number;

  @ApiProperty({ example: ['users.read.execute', 'roles.read.execute'], description: 'Permission codes' })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex color like #RRGGBB' })
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GrantPermissionsDto {
  @ApiProperty({ example: ['users.create.execute', 'users.update.execute'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionCodes!: string[];
}

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: RoleScopeDto })
  scope!: RoleScopeDto;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiPropertyOptional()
  color?: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
