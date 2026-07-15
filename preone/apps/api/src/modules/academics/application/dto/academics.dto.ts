/**
 * Academics DTOs — request/response shapes for /v1/academics/* endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum, IsInt, Min, Max,
  IsBoolean, IsArray, IsDateString, IsObject, MinDate,
} from 'class-validator';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum AcademicSessionStatusDto {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum AcademicTermTypeDto {
  QUARTER = 'QUARTER',
  SEMESTER = 'SEMESTER',
  TRIMESTER = 'TRIMESTER',
  TERM = 'TERM',
  MONTH = 'MONTH',
}

export enum CurriculumStatusDto {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SectionStatusDto {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  MERGED = 'MERGED',
}

export enum EnrollmentStatusDto {
  ENROLLED = 'ENROLLED',
  PROMOTED = 'PROMOTED',
  REPEATED = 'REPEATED',
  TRANSFERRED = 'TRANSFERRED',
  WITHDRAWN = 'WITHDRAWN',
  COMPLETED = 'COMPLETED',
}

export enum EnrollmentTypeDto {
  NEW = 'NEW',
  CONTINUING = 'CONTINUING',
  TRANSFER_IN = 'TRANSFER_IN',
  REPEAT = 'REPEAT',
}

export enum AssessmentTypeDto {
  FORMATIVE = 'FORMATIVE',
  SUMMATIVE = 'SUMMATIVE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  OBSERVATIONAL = 'OBSERVATIONAL',
  PORTFOLIO = 'PORTFOLIO',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
}

export enum AssessmentStatusDto {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ObservationCategoryDto {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  EMOTIONAL = 'EMOTIONAL',
  PHYSICAL = 'PHYSICAL',
  LANGUAGE = 'LANGUAGE',
  CREATIVE = 'CREATIVE',
  COGNITIVE = 'COGNITIVE',
  BEHAVIORAL = 'BEHAVIORAL',
  HEALTH = 'HEALTH',
  GENERAL = 'GENERAL',
}

export enum ReportCardStatusDto {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  SHARED_WITH_PARENTS = 'SHARED_WITH_PARENTS',
  ARCHIVED = 'ARCHIVED',
}

export enum PortfolioItemTypeDto {
  ARTWORK = 'ARTWORK',
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  WRITTEN = 'WRITTEN',
  PROJECT = 'PROJECT',
  CERTIFICATE = 'CERTIFICATE',
  MILESTONE = 'MILESTONE',
  OTHER = 'OTHER',
}

// ─────────────────────────────────────────────
// AcademicSession DTOs
// ─────────────────────────────────────────────

export class CreateAcademicSessionDto {
  @ApiProperty({ example: '2025-26' })
  @IsString() @IsNotEmpty() @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'AY2526' })
  @IsString() @IsNotEmpty() @MaxLength(16)
  code!: string;

  @ApiProperty({ example: '2025-04-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  endDate!: string;
}

export class ListAcademicSessionsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @IsInt() @Min(1) @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({ enum: AcademicSessionStatusDto })
  @IsOptional() @IsEnum(AcademicSessionStatusDto)
  status?: AcademicSessionStatusDto;
}

export class AcademicSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty({ enum: AcademicSessionStatusDto }) status!: AcademicSessionStatusDto;
  @ApiProperty() isCurrent!: boolean;
  @ApiPropertyOptional() activatedAt?: string;
  @ApiPropertyOptional() completedAt?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ─────────────────────────────────────────────
// Section DTOs
// ─────────────────────────────────────────────

export class CreateSectionDto {
  @ApiProperty() @IsString() @IsNotEmpty() branchId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sessionId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() classroomId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() curriculumId?: string;

  @ApiProperty({ example: 'Nursery A' })
  @IsString() @IsNotEmpty() @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'NSY-A' })
  @IsString() @IsNotEmpty() @MaxLength(16)
  code!: string;

  @ApiProperty({ example: 'NURSERY' })
  @IsString() @IsNotEmpty() @MaxLength(32)
  gradeLevel!: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(100)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Min age in months' })
  @IsOptional() @IsInt() @Min(0) @Max(120)
  minAgeMonths?: number;

  @ApiPropertyOptional({ description: 'Max age in months' })
  @IsOptional() @IsInt() @Min(0) @Max(120)
  maxAgeMonths?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(16)
  roomNumber?: string;
}

export class SectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() branchId!: string;
  @ApiProperty() sessionId!: string;
  @ApiProperty() classroomId!: string;
  @ApiPropertyOptional() curriculumId?: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() gradeLevel!: string;
  @ApiProperty() capacity!: number;
  @ApiProperty() enrolledCount!: number;
  @ApiProperty() seatsAvailable!: number;
  @ApiProperty() isFull!: boolean;
  @ApiProperty() minAgeMonths!: number;
  @ApiProperty() maxAgeMonths!: number;
  @ApiProperty({ enum: SectionStatusDto }) status!: SectionStatusDto;
  @ApiPropertyOptional() roomNumber?: string;
  @ApiPropertyOptional() activatedAt?: string;
  @ApiPropertyOptional() closedAt?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ─────────────────────────────────────────────
// Enrollment DTOs
// ─────────────────────────────────────────────

export class CreateEnrollmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() studentId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sessionId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sectionId!: string;
  @ApiProperty({ enum: EnrollmentTypeDto }) @IsEnum(EnrollmentTypeDto) type!: EnrollmentTypeDto;
  @ApiProperty() @IsDateString() startDate!: string;
}

export class PromoteEnrollmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() toSectionId!: string;
}

export class TransferEnrollmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() toSectionId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class WithdrawEnrollmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class EnrollmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() sessionId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() enrollmentNumber!: string;
  @ApiProperty({ enum: EnrollmentTypeDto }) type!: EnrollmentTypeDto;
  @ApiProperty({ enum: EnrollmentStatusDto }) status!: EnrollmentStatusDto;
  @ApiProperty() enrolledAt!: string;
  @ApiProperty() startDate!: string;
  @ApiPropertyOptional() endDate?: string;
  @ApiPropertyOptional() exitedAt?: string;
  @ApiPropertyOptional() exitReason?: string;
  @ApiPropertyOptional() previousSectionId?: string;
  @ApiPropertyOptional() nextSectionId?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ─────────────────────────────────────────────
// Curriculum DTOs
// ─────────────────────────────────────────────

export class CreateCurriculumDto {
  @ApiProperty() @IsString() @IsNotEmpty() sessionId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() branchId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() classroomId!: string;
  @ApiProperty({ example: 'Nursery Curriculum 2025-26' })
  @IsString() @IsNotEmpty() @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: 'NURSERY' }) @IsString() @IsNotEmpty() @MaxLength(32) gradeLevel!: string;
}

export class CurriculumResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() branchId!: string;
  @ApiProperty() sessionId!: string;
  @ApiProperty() classroomId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: CurriculumStatusDto }) status!: CurriculumStatusDto;
  @ApiProperty() gradeLevel!: string;
  @ApiPropertyOptional() pedagogy?: string;
  @ApiPropertyOptional() publishedAt?: string;
  @ApiPropertyOptional() publishedBy?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ─────────────────────────────────────────────
// Observation DTOs
// ─────────────────────────────────────────────

export class CreateObservationDto {
  @ApiProperty() @IsString() @IsNotEmpty() enrollmentId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sectionId!: string;
  @ApiProperty({ enum: ObservationCategoryDto }) @IsEnum(ObservationCategoryDto) category!: ObservationCategoryDto;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiPropertyOptional({ description: '1-5 rating scale' })
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean() isPrivate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() observedAt?: string;
}

export class ObservationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() enrollmentId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() observedAt!: string;
  @ApiProperty({ enum: ObservationCategoryDto }) category!: ObservationCategoryDto;
  @ApiPropertyOptional() title?: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() rating?: number;
  @ApiProperty() isPrivate!: boolean;
  @ApiProperty() isSharedWithParent!: boolean;
  @ApiPropertyOptional() sharedAt?: string;
  @ApiProperty() observedBy!: string;
  @ApiProperty() createdAt!: string;
}

// ─────────────────────────────────────────────
// Assessment DTOs
// ─────────────────────────────────────────────

export class CreateAssessmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() sectionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() termId?: string;
  @ApiProperty({ example: 'Q1 Math Assessment' })
  @IsString() @IsNotEmpty() @MaxLength(160) name!: string;
  @ApiProperty({ enum: AssessmentTypeDto }) @IsEnum(AssessmentTypeDto) type!: AssessmentTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) totalMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) passingMarks?: number;
  @ApiPropertyOptional({ default: 0, description: 'Weight in final grade (0-100)' })
  @IsOptional() @IsInt() @Min(0) @Max(100) weightPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class AssessmentItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiProperty({ default: 10 }) @IsInt() @Min(1) @Max(100) maxMarks!: number;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) @Max(100) weightPercent!: number;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() learningOutcomeId?: string;
}

export class AddAssessmentItemDto {
  @ApiProperty({ type: () => AssessmentItemDto })
  @IsObject()
  item!: AssessmentItemDto;
}

export class RecordScoreDto {
  @ApiProperty() @IsString() @IsNotEmpty() itemId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() enrollmentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) marks?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAbsent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isExcused?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

export class AssessmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() sectionId!: string;
  @ApiPropertyOptional() termId?: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: AssessmentTypeDto }) type!: AssessmentTypeDto;
  @ApiProperty({ enum: AssessmentStatusDto }) status!: AssessmentStatusDto;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() totalMarks?: number;
  @ApiPropertyOptional() passingMarks?: number;
  @ApiProperty() weightPercent!: number;
  @ApiPropertyOptional() scheduledAt?: string;
  @ApiPropertyOptional() startedAt?: string;
  @ApiPropertyOptional() completedAt?: string;
  @ApiProperty() createdBy!: string;
  @ApiProperty() createdAt!: string;
}

// ─────────────────────────────────────────────
// ReportCard DTOs
// ─────────────────────────────────────────────

export class CreateReportCardDto {
  @ApiProperty() @IsString() @IsNotEmpty() enrollmentId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() sectionId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() termId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() templateId!: string;
}

export class ReportCardResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() enrollmentId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() termId!: string;
  @ApiProperty() templateId!: string;
  @ApiProperty({ enum: ReportCardStatusDto }) status!: ReportCardStatusDto;
  @ApiPropertyOptional() overallGrade?: string;
  @ApiPropertyOptional() teacherComment?: string;
  @ApiPropertyOptional() principalComment?: string;
  @ApiPropertyOptional() generatedAt?: string;
  @ApiPropertyOptional() publishedAt?: string;
  @ApiPropertyOptional() sharedAt?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class UpdateReportCardCommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() comment!: string;
}

// ─────────────────────────────────────────────
// Portfolio DTOs
// ─────────────────────────────────────────────

export class CreatePortfolioItemDto {
  @ApiProperty({ enum: PortfolioItemTypeDto }) @IsEnum(PortfolioItemTypeDto) type!: PortfolioItemTypeDto;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() s3ObjectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() capturedAt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) milestoneIds?: string[];
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isHighlight?: boolean;
}

export class PortfolioResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() enrollmentId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() coverImageUrl?: string;
  @ApiProperty() itemCount!: number;
  @ApiProperty() isSharedWithParent!: boolean;
  @ApiProperty() createdAt!: string;
}

export class PortfolioItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PortfolioItemTypeDto }) type!: PortfolioItemTypeDto;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiProperty() capturedAt!: string;
  @ApiProperty() capturedBy!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() isHighlight!: boolean;
  @ApiProperty() sortOrder!: number;
}
