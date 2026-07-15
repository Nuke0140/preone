/**
 * Auth DTOs — request/response shapes for /v1/auth/* endpoints.
 *
 * Per BTD §8 — DTOs use class-validator decorators + Zod schema + Swagger.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@school.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'E.164 phone format' })
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone!: string;

  @ApiPropertyOptional({ example: 'login', description: 'Purpose of OTP' })
  @IsString()
  purpose?: 'login' | 'phone_verification' | 'password_reset';
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+91\d{10}$/)
  phone!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'Access token TTL in seconds' })
  expiresIn!: number;

  @ApiProperty({
    example: {
      id: 'usr_01HXY...',
      email: 'owner@school.com',
      tenantId: 'sch_01HXY...',
      branchId: 'br_01HXY...',
      roles: ['SCHOOL_ADMIN'],
      permissionsVersion: 1,
    },
  })
  user!: {
    id: string;
    email: string;
    tenantId: string;
    branchId?: string;
    roles: string[];
    permissionsVersion: number;
  };
}
