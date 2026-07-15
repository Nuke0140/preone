/**
 * Academics Controllers — HTTP endpoints for all Academics sub-domains.
 *
 * Per BTD §4.3 Module Catalog #5:
 *   "academics — Curriculum, Observations, Report Cards — ~60 APIs"
 *
 * Controllers in this file:
 *   1. AcademicSessionsController — /v1/academic-sessions
 *   2. CurriculaController — /v1/curricula
 *   3. SectionsController — /v1/sections
 *   4. EnrollmentsController — /v1/enrollments
 *   5. ObservationsController — /v1/observations
 *   6. AssessmentsController — /v1/assessments
 *   7. ReportCardsController — /v1/report-cards
 *   8. PortfoliosController — /v1/portfolios
 */
import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  AcademicSessionResponseDto, AssessmentResponseDto, CreateAcademicSessionDto,
  CreateAssessmentDto, CreateCurriculumDto, CreateEnrollmentDto,
  CreateObservationDto, CreateReportCardDto, CreateSectionDto,
  CurriculumResponseDto, EnrollmentResponseDto, ListAcademicSessionsQueryDto,
  ObservationResponseDto, PortfolioResponseDto, PromoteEnrollmentDto,
  RecordScoreDto, ReportCardResponseDto, SectionResponseDto,
  TransferEnrollmentDto, WithdrawEnrollmentDto, CreatePortfolioItemDto,
} from '../application/dto/academics.dto';
import {
  AcademicSessionService, AssessmentService, CurriculumService,
  EnrollmentService, ObservationService, PortfolioService,
  ReportCardService, SectionService,
} from '../application/services/academics.service';

// ─────────────────────────────────────────────
// 1. AcademicSessionsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(private readonly sessions: AcademicSessionService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List academic sessions' })
  async list(@Query() query: ListAcademicSessionsQueryDto) {
    const result = await this.sessions.listSessions('system', query.page ?? 1, query.pageSize ?? 25, query.status);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get academic session by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<AcademicSessionResponseDto>> {
    return ResponseDto.success(await this.sessions.getSession(id));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create academic session' })
  async create(@Body() dto: CreateAcademicSessionDto): Promise<ResponseDto<AcademicSessionResponseDto>> {
    return ResponseDto.success(await this.sessions.createSession(dto, 'system', 'system'));
  }

  @Post(':id/activate')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Activate academic session' })
  async activate(@Param('id') id: string): Promise<ResponseDto<AcademicSessionResponseDto>> {
    return ResponseDto.success(await this.sessions.activateSession(id, 'system', 'system'));
  }

  @Post(':id/complete')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Complete academic session' })
  async complete(@Param('id') id: string): Promise<ResponseDto<AcademicSessionResponseDto>> {
    return ResponseDto.success(await this.sessions.completeSession(id, 'system'));
  }
}

// ─────────────────────────────────────────────
// 2. CurriculaController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('curricula')
export class CurriculaController {
  constructor(private readonly curricula: CurriculumService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List curricula' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.curricula.listCurricula('system', +page, +pageSize, filters));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create curriculum' })
  async create(@Body() dto: CreateCurriculumDto): Promise<ResponseDto<CurriculumResponseDto>> {
    return ResponseDto.success(await this.curricula.createCurriculum(dto, 'system', 'system'));
  }

  @Post(':id/publish')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Publish curriculum' })
  async publish(@Param('id') id: string): Promise<ResponseDto<CurriculumResponseDto>> {
    return ResponseDto.success(await this.curricula.publishCurriculum(id, 'system', 'system'));
  }
}

// ─────────────────────────────────────────────
// 3. SectionsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('sections')
export class SectionsController {
  constructor(private readonly sections: SectionService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List sections' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.sections.listSections('system', +page, +pageSize, filters));
  }

  @Get(':id')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get section by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<SectionResponseDto>> {
    return ResponseDto.success(await this.sections.getSection(id));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create section' })
  async create(@Body() dto: CreateSectionDto): Promise<ResponseDto<SectionResponseDto>> {
    return ResponseDto.success(await this.sections.createSection(dto, 'system', 'system'));
  }

  @Post(':id/activate')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Activate section' })
  async activate(@Param('id') id: string): Promise<ResponseDto<SectionResponseDto>> {
    return ResponseDto.success(await this.sections.activateSection(id, 'system'));
  }

  @Post(':id/close')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Close section' })
  async close(@Param('id') id: string): Promise<ResponseDto<SectionResponseDto>> {
    return ResponseDto.success(await this.sections.closeSection(id, 'system'));
  }
}

// ─────────────────────────────────────────────
// 4. EnrollmentsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List enrollments' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.enrollments.listEnrollments('system', +page, +pageSize, filters));
  }

  @Get(':id')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<EnrollmentResponseDto>> {
    return ResponseDto.success(await this.enrollments.getEnrollment(id));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create enrollment (enrol student in section)' })
  async create(@Body() dto: CreateEnrollmentDto): Promise<ResponseDto<EnrollmentResponseDto>> {
    return ResponseDto.success(await this.enrollments.createEnrollment(dto, 'system', 'system'));
  }

  @Post(':id/promote')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Promote enrollment to next section' })
  async promote(@Param('id') id: string, @Body() dto: PromoteEnrollmentDto): Promise<ResponseDto<EnrollmentResponseDto>> {
    return ResponseDto.success(await this.enrollments.promoteEnrollment(id, dto.toSectionId, 'system'));
  }

  @Post(':id/transfer')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Transfer enrollment to another section' })
  async transfer(@Param('id') id: string, @Body() dto: TransferEnrollmentDto): Promise<ResponseDto<EnrollmentResponseDto>> {
    return ResponseDto.success(await this.enrollments.promoteEnrollment(id, dto.toSectionId, 'system'));
  }

  @Post(':id/withdraw')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Withdraw enrollment' })
  async withdraw(@Param('id') id: string, @Body() dto: WithdrawEnrollmentDto): Promise<ResponseDto<EnrollmentResponseDto>> {
    return ResponseDto.success(await this.enrollments.withdrawEnrollment(id, dto.reason, 'system'));
  }
}

// ─────────────────────────────────────────────
// 5. ObservationsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('observations')
export class ObservationsController {
  constructor(private readonly observations: ObservationService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List observations' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.observations.listObservations('system', +page, +pageSize, filters));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Record observation' })
  async create(@Body() dto: CreateObservationDto): Promise<ResponseDto<ObservationResponseDto>> {
    return ResponseDto.success(await this.observations.createObservation(dto, 'system', 'system'));
  }

  @Post(':id/share')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Share observation with parent' })
  async share(@Param('id') id: string): Promise<ResponseDto<ObservationResponseDto>> {
    return ResponseDto.success(await this.observations.shareWithParent(id, 'system'));
  }
}

// ─────────────────────────────────────────────
// 6. AssessmentsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List assessments' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.assessments.listAssessments('system', +page, +pageSize, filters));
  }

  @Get(':id')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get assessment by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<AssessmentResponseDto>> {
    return ResponseDto.success(await this.assessments.getAssessment(id));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create assessment' })
  async create(@Body() dto: CreateAssessmentDto): Promise<ResponseDto<AssessmentResponseDto>> {
    return ResponseDto.success(await this.assessments.createAssessment(dto, 'system', 'system'));
  }

  @Post(':id/start')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Start assessment' })
  async start(@Param('id') id: string): Promise<ResponseDto<AssessmentResponseDto>> {
    return ResponseDto.success(await this.assessments.startAssessment(id, 'system'));
  }

  @Post(':id/complete')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Complete assessment' })
  async complete(@Param('id') id: string): Promise<ResponseDto<AssessmentResponseDto>> {
    return ResponseDto.success(await this.assessments.completeAssessment(id, 'system'));
  }

  @Post(':id/scores')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Record score for an assessment item' })
  async recordScore(
    @Param('id') id: string,
    @Body() dto: RecordScoreDto,
  ): Promise<ResponseDto<AssessmentResponseDto>> {
    return ResponseDto.success(await this.assessments.recordScore(id, dto, 'system', 'system'));
  }
}

// ─────────────────────────────────────────────
// 7. ReportCardsController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('report-cards')
export class ReportCardsController {
  constructor(private readonly reportCards: ReportCardService) {}

  @Get()
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'List report cards' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 25, @Query() filters: any) {
    return ResponseDto.success(await this.reportCards.listReportCards('system', +page, +pageSize, filters));
  }

  @Get(':id')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get report card by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<ReportCardResponseDto>> {
    return ResponseDto.success(await this.reportCards.getReportCard(id));
  }

  @Post()
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Create report card (draft)' })
  async create(@Body() dto: CreateReportCardDto): Promise<ResponseDto<ReportCardResponseDto>> {
    return ResponseDto.success(await this.reportCards.createReportCard(dto, 'system', 'system'));
  }

  @Post(':id/generate')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Generate report card' })
  async generate(@Param('id') id: string): Promise<ResponseDto<ReportCardResponseDto>> {
    return ResponseDto.success(await this.reportCards.generateReportCard(id, 'system', 'system'));
  }

  @Post(':id/publish')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Publish report card' })
  async publish(@Param('id') id: string): Promise<ResponseDto<ReportCardResponseDto>> {
    return ResponseDto.success(await this.reportCards.publishReportCard(id, 'system', 'system'));
  }

  @Post(':id/share')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Share report card with parents' })
  async share(@Param('id') id: string): Promise<ResponseDto<ReportCardResponseDto>> {
    return ResponseDto.success(await this.reportCards.shareReportCard(id, 'system'));
  }
}

// ─────────────────────────────────────────────
// 8. PortfoliosController
// ─────────────────────────────────────────────

@ApiTags('academics')
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfolios: PortfolioService) {}

  @Get(':enrollmentId')
  @Permissions('academics.read.execute')
  @ApiOperation({ summary: 'Get portfolio by enrollment ID' })
  async get(@Param('enrollmentId') enrollmentId: string): Promise<ResponseDto<PortfolioResponseDto>> {
    return ResponseDto.success(await this.portfolios.getPortfolio(enrollmentId));
  }

  @Post(':enrollmentId/items')
  @Permissions('academics.create.execute')
  @ApiOperation({ summary: 'Add portfolio item' })
  async addItem(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: CreatePortfolioItemDto,
  ) {
    return ResponseDto.success(await this.portfolios.addPortfolioItem(enrollmentId, dto, 'system', 'system'));
  }

  @Post(':portfolioId/items/:itemId/highlight')
  @Permissions('academics.update.execute')
  @ApiOperation({ summary: 'Highlight portfolio item' })
  async highlight(
    @Param('portfolioId') portfolioId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.portfolios.highlightItem(portfolioId, itemId);
    return ResponseDto.success({ ok: true });
  }
}
