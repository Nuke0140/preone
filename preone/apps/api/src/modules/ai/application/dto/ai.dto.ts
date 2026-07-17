/**
 * AI DTOs — request/response shapes for the 5 Wave 18 AI endpoints.
 *
 * Per the Wave 18 spec, the 5 endpoints are:
 *   POST /v1/ai/lesson-plan/generate
 *   POST /v1/ai/report-card/generate
 *   POST /v1/ai/observation/suggest
 *   POST /v1/ai/reply/suggest
 *   GET  /v1/ai/insights
 *
 * All request DTOs use class-validator decorators so the global
 * ValidationPipe can enforce them. All response DTOs are simple
 * interfaces — they're not validated on the way out.
 *
 * PII note: requests may contain student names, guardian names, or
 * observation notes. The AI service redacts obvious PII patterns
 * (Aadhaar, PAN, phone, email) before sending the prompt to the LLM.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsInt, IsOptional, IsString, IsEnum, Min, Max, MinLength,
} from 'class-validator';

// ─── 1. Lesson Plan ──────────────────────────────────────────────

export class LessonPlanTopicUnitDto {
  @ApiProperty({ example: 'Living Things vs Non-Living Things' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ example: 'Identify living vs non-living things in the classroom' })
  @IsOptional()
  @IsString()
  objective?: string;
}

export class GenerateLessonPlanRequestDto {
  @ApiProperty({ example: 'Nursery-B' })
  @IsString()
  @MinLength(1)
  ageGroup!: string;

  @ApiProperty({ example: '30', description: 'Lesson duration in minutes' })
  @IsInt()
  @Min(5)
  @Max(180)
  durationMinutes!: number;

  @ApiProperty({ type: [LessonPlanTopicUnitDto] })
  @IsArray()
  topics!: LessonPlanTopicUnitDto[];

  @ApiPropertyOptional({ example: 'Use only Montessori materials' })
  @IsOptional()
  @IsString()
  pedagogicalPreference?: string;

  @ApiPropertyOptional({ example: 'Some students are ELL' })
  @IsOptional()
  @IsString()
  specialNotes?: string;
}

export class GenerateLessonPlanResponseDto {
  @ApiProperty()
  lessonPlanMarkdown!: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  model!: string;

  @ApiProperty({ example: '1280' })
  totalTokens!: number;

  @ApiProperty({ example: '1200' })
  durationMs!: number;
}

// ─── 2. Report Card ──────────────────────────────────────────────

export class AssessmentScoreDto {
  @ApiProperty({ example: 'Language' })
  @IsString()
  subject!: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  grade!: string;

  @ApiPropertyOptional({ example: '85' })
  @IsOptional()
  @IsString()
  percentage?: string;

  @ApiPropertyOptional({ example: 'Strong verbal expression' })
  @IsOptional()
  @IsString()
  teacherNote?: string;
}

export class GenerateReportCardRequestDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  studentName!: string;

  @ApiProperty({ example: 'Nursery-B' })
  @IsString()
  className!: string;

  @ApiProperty({ example: 'Term 1 2026-27' })
  @IsString()
  term!: string;

  @ApiProperty({ type: [AssessmentScoreDto] })
  @IsArray()
  scores!: AssessmentScoreDto[];

  @ApiPropertyOptional({ example: 'Improved social skills this term' })
  @IsOptional()
  @IsString()
  teacherComments?: string;

  @ApiPropertyOptional({ enum: ['formal', 'encouraging', 'parent-friendly'] })
  @IsOptional()
  @IsEnum(['formal', 'encouraging', 'parent-friendly'])
  tone?: 'formal' | 'encouraging' | 'parent-friendly';
}

export class GenerateReportCardResponseDto {
  @ApiProperty()
  reportCardMarkdown!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty()
  durationMs!: number;
}

// ─── 3. Observation Suggest ──────────────────────────────────────

export class ObservationSuggestRequestDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  studentName!: string;

  @ApiProperty({ example: 'Nursery-B' })
  @IsString()
  className!: string;

  @ApiPropertyOptional({ example: 'Free play' })
  @IsOptional()
  @IsString()
  activityContext?: string;

  @ApiPropertyOptional({ example: ['Cognitive', 'Social-Emotional'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({
    example: 'Aarav built a tall tower with blocks and shared blocks with peers.',
  })
  @IsOptional()
  @IsString()
  rawNotes?: string;
}

export class ObservationSuggestResponseDto {
  @ApiProperty({ type: [String], description: 'Suggested observation bullet points' })
  suggestions!: string[];

  @ApiProperty()
  model!: string;

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty()
  durationMs!: number;
}

// ─── 4. Reply Suggest ────────────────────────────────────────────

export class ReplySuggestRequestDto {
  @ApiProperty({ description: 'Inbound message from the parent/teacher' })
  @IsString()
  @MinLength(1)
  inboundMessage!: string;

  @ApiPropertyOptional({ description: 'Conversation history (last N messages, oldest first)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conversationHistory?: string[];

  @ApiPropertyOptional({ enum: ['parent', 'teacher', 'admin'] })
  @IsOptional()
  @IsEnum(['parent', 'teacher', 'admin'])
  replyAsRole?: 'parent' | 'teacher' | 'admin';

  @ApiPropertyOptional({ example: 'Reschedule the meeting to next week' })
  @IsOptional()
  @IsString()
  intentHint?: string;
}

export class ReplySuggestResponseDto {
  @ApiProperty({ type: [String], description: '3 suggested replies, shortest first' })
  replies!: string[];

  @ApiProperty()
  model!: string;

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty()
  durationMs!: number;
}

// ─── 5. Insights ─────────────────────────────────────────────────

export class GetInsightsQueryDto {
  @ApiPropertyOptional({ example: '01HBR', description: 'Filter to a specific branch' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: '7', description: 'Window in days (default 7, max 90)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  windowDays?: number;
}

export class GetInsightsResponseDto {
  @ApiProperty({ description: 'Markdown summary of the AI-generated insights' })
  summaryMarkdown!: string;

  @ApiProperty({
    description: 'Bullet-point highlights',
    type: [String],
  })
  highlights!: string[];

  @ApiProperty()
  model!: string;

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty({ description: 'KPIs the summary was based on' })
  kpiSnapshot!: {
    attendanceRate: number;
    feeCollectionRate: number;
    activeStudents: number;
    activeStaff: number;
    pendingLeads: number;
    windowDays: number;
  };
}
