/**
 * Student DTOs — request/response shapes for /v1/students/* endpoints.
 *
 * Per BTD §8 — DTOs:
 *   - Use class-validator decorators for runtime validation
 *   - Use @ApiProperty for Swagger metadata
 *   - DTOs are the contract between client and server
 *
 * Per BTD §20.3 — PII Encryption:
 *   - aadhaarNumber, birthCertificateNumber are PII — encrypted at rest
 *   - Never return these in response DTOs without explicit field selection
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, Matches, IsOptional,
  IsEnum, IsInt, Min, Max, IsBoolean, IsArray, ValidateNested, IsDateString,
} from 'class-validator';

// ─────────────────────────────────────────────
// Enums (DTO-facing)
// ─────────────────────────────────────────────

export enum StudentStatusDto {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TRANSFERRED = 'TRANSFERRED',
  GRADUATED = 'GRADUATED',
  WITHDRAWN = 'WITHDRAWN',
  EXPELLED = 'EXPELLED',
}

export enum GenderDto {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum BloodGroupDto {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum GuardianRelationDto {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GRANDFATHER = 'GRANDFATHER',
  GRANDMOTHER = 'GRANDMOTHER',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  UNCLE = 'UNCLE',
  AUNT = 'AUNT',
  OTHER = 'OTHER',
}

// ─────────────────────────────────────────────
// Guardian DTOs
// ─────────────────────────────────────────────

export class GuardianDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'phone must be +91 followed by 10 digits' })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'altPhone must be +91 followed by 10 digits' })
  altPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  employer?: string;

  @ApiPropertyOptional({ description: 'Annual income in INR cents (1 INR = 100 cents)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  annualIncomeCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  education?: string;

  @ApiProperty({ enum: GuardianRelationDto })
  @IsEnum(GuardianRelationDto)
  relation!: GuardianRelationDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPickupAuthorized?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Has legal custody of the child' })
  @IsOptional()
  @IsBoolean()
  custodyHolder?: boolean;
}

// ─────────────────────────────────────────────
// Create Student
// ─────────────────────────────────────────────

export class CreateStudentDto {
  @ApiProperty({ description: 'Branch ID where student is being admitted' })
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({ example: 'STU-2025-0001', description: 'Unique admission number within branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  admissionNumber!: string;

  @ApiProperty({ example: 'Aarav' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  legalFirstName!: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  legalLastName!: string;

  @ApiPropertyOptional({ example: 'Aaru' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredName?: string;

  @ApiProperty({ example: '2021-04-15', description: 'ISO date of birth' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: GenderDto, default: GenderDto.UNSPECIFIED })
  @IsEnum(GenderDto)
  gender!: GenderDto;

  @ApiPropertyOptional({ enum: BloodGroupDto, default: BloodGroupDto.UNKNOWN })
  @IsOptional()
  @IsEnum(BloodGroupDto)
  bloodGroup?: BloodGroupDto;

  @ApiPropertyOptional({ default: 'Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  religion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  motherTongue?: string;

  @ApiPropertyOptional({ description: '12-digit Aadhaar — encrypted at rest' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'aadhaarNumber must be 12 digits' })
  aadhaarNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthCertificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeOfBirth?: string;

  @ApiPropertyOptional({ description: 'URL to student profile photo (S3 pre-signed)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Notes for staff — custody arrangements, court orders' })
  @IsOptional()
  @IsString()
  custodyNotes?: string;

  @ApiPropertyOptional({ default: false, description: 'If true, only authorised persons in pickup_authorizations table may pick up' })
  @IsOptional()
  @IsBoolean()
  isPickupRestricted?: boolean;

  @ApiProperty({ type: () => [GuardianDto], minItems: 1, description: 'At least one guardian is required' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardianDto)
  guardians!: GuardianDto[];
}

// ─────────────────────────────────────────────
// Update Student
// ─────────────────────────────────────────────

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  religion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  motherTongue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custodyNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPickupRestricted?: boolean;
}

// ─────────────────────────────────────────────
// State transition DTOs
// ─────────────────────────────────────────────

export class EnrollStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @ApiProperty({ example: 'NURSERY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  gradeLevel!: string;

  @ApiPropertyOptional({ description: 'Override enrolment timestamp (default now)' })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string;
}

export class PromoteStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toSectionId!: string;

  @ApiProperty({ example: 'LKG' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  toGradeLevel!: string;
}

export class TransferStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toBranchId!: string;

  @ApiPropertyOptional({ description: 'Set if transferring to a different school' })
  @IsOptional()
  @IsString()
  toSchoolId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class WithdrawStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class AddGuardianDto extends GuardianDto {}

export class SetPrimaryGuardianDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guardianId!: string;
}

// ─────────────────────────────────────────────
// List / Search
// ─────────────────────────────────────────────

export class ListStudentsQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: StudentStatusDto })
  @IsOptional()
  @IsEnum(StudentStatusDto)
  status?: StudentStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────

export class GuardianResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() altPhone?: string;
  @ApiPropertyOptional() occupation?: string;
  @ApiPropertyOptional() employer?: string;
  @ApiPropertyOptional() annualIncomeCents?: number;
  @ApiPropertyOptional() education?: string;
  @ApiProperty({ enum: GuardianRelationDto }) relation!: GuardianRelationDto;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty() isPickupAuthorized!: boolean;
  @ApiProperty() isEmergencyContact!: boolean;
  @ApiProperty() custodyHolder!: boolean;
  @ApiPropertyOptional() userId?: string;
}

export class StudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() branchId!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty() legalFirstName!: string;
  @ApiProperty() legalLastName!: string;
  @ApiPropertyOptional() preferredName?: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() dateOfBirth!: string;
  @ApiProperty() ageMonths!: number;
  @ApiProperty({ enum: GenderDto }) gender!: GenderDto;
  @ApiProperty({ enum: BloodGroupDto }) bloodGroup!: BloodGroupDto;
  @ApiProperty() nationality!: string;
  @ApiPropertyOptional() religion?: string;
  @ApiPropertyOptional() motherTongue?: string;
  @ApiPropertyOptional() photoUrl?: string;
  @ApiProperty({ enum: StudentStatusDto }) status!: StudentStatusDto;
  @ApiProperty() admittedAt!: string;
  @ApiPropertyOptional() enrolledAt?: string;
  @ApiPropertyOptional() exitedAt?: string;
  @ApiPropertyOptional() exitReason?: string;
  @ApiPropertyOptional() currentGradeLevel?: string;
  @ApiPropertyOptional() currentSectionId?: string;
  @ApiPropertyOptional() allergiesSummary?: string;
  @ApiPropertyOptional({ type: 'array' }) medicalAlerts?: Array<{ severity: string; summary: string }>;
  @ApiPropertyOptional() custodyNotes?: string;
  @ApiProperty() isPickupRestricted!: boolean;
  @ApiProperty({ type: () => [GuardianResponseDto] }) guardians!: GuardianResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class StudentListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() legalFirstName!: string;
  @ApiProperty() legalLastName!: string;
  @ApiProperty() dateOfBirth!: string;
  @ApiProperty() ageMonths!: number;
  @ApiProperty({ enum: GenderDto }) gender!: GenderDto;
  @ApiProperty({ enum: StudentStatusDto }) status!: StudentStatusDto;
  @ApiPropertyOptional() currentGradeLevel?: string;
  @ApiPropertyOptional() currentSectionId?: string;
  @ApiProperty() primaryGuardianName!: string;
  @ApiProperty() primaryGuardianPhone!: string;
}
