/**
 * Admissions Controllers — REST endpoints for the Admissions module.
 *
 * Per BTD §4.3 Module Catalog #3:
 *   "admissions — Applications, Counselling, Approvals — ~50 APIs"
 *
 * Controllers:
 *   1. ApplicationsController  — Application CRUD + lifecycle + documents + counselling + offers
 *   2. AdmissionsController    — Final admission records (post-approval)
 *   3. WaitingListController   — Waitlist management
 */
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  addPriorityFactorSchema, ageVerificationSchema,
  cancelAdmissionSchema, cancelApplicationSchema, completeCounsellingSchema,
  createApplicationSchema, feePlanQuoteSchema, issueOfferSchema,
  listAdmissionsQuerySchema, listApplicationsQuerySchema, offerSeatSchema,
  recordApprovalSchema, rejectApplicationSchema, rejectDocumentSchema,
  scheduleCounsellingSchema, siblingConcessionSchema, submitApplicationSchema,
  updateApplicationSchema, uploadDocumentSchema,
} from '../application/dto/admissions.dto';
import { AdmissionsService } from '../application/services/admissions.service';

// Placeholder tenant/actor — in production these come from JWT guard
const TENANT_ID = 'system';
const ACTOR_ID = 'system';

@ApiTags('admissions')
@Controller('admissions/applications')
export class ApplicationsController {
  constructor(private readonly svc: AdmissionsService) {}

  @Get()
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'List admission applications (paginated)' })
  async list(@Query() query: Record<string, string>) {
    const parsed = listApplicationsQuerySchema.parse({
      ...query,
      page: query.page ?? '1',
      pageSize: query.pageSize ?? '20',
    });
    const result = await this.svc.listApplications({ tenantId: TENANT_ID, ...parsed }, parsed.page, parsed.pageSize);
    return ResponseDto.success(result);
  }

  @Get('pipeline')
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'Get admission pipeline summary (counts by status)' })
  async getPipeline(@Query('branchId') branchId: string, @Query('academicSessionId') academicSessionId: string) {
    const result = await this.svc.getPipeline(TENANT_ID, branchId, academicSessionId);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'Get application by ID' })
  async get(@Param('id') id: string) {
    const result = await this.svc.getApplication(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('admissions.create.execute')
  @ApiOperation({ summary: 'Create new admission application (DRAFT)' })
  async create(@Body() body: unknown) {
    const dto = createApplicationSchema.parse(body);
    const result = await this.svc.createApplication({ ...dto, tenantId: TENANT_ID }, ACTOR_ID);
    return ResponseDto.success(result);
  }

  @Patch(':id')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Update draft application' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto = updateApplicationSchema.parse(body);
    const result = await this.svc.updateApplication(id, dto, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/submit')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Submit application (DRAFT → SUBMITTED → DOCUMENT_PENDING)' })
  async submit(@Param('id') id: string) {
    submitApplicationSchema.parse({});
    const result = await this.svc.submitApplication(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/reject')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Reject application' })
  async reject(@Param('id') id: string, @Body() body: unknown) {
    const dto = rejectApplicationSchema.parse(body);
    const result = await this.svc.rejectApplication(id, dto.reason, dto.notes, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/cancel')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Cancel application' })
  async cancel(@Param('id') id: string, @Body() body: unknown) {
    const dto = cancelApplicationSchema.parse(body);
    const result = await this.svc.cancelApplication(id, dto.reason, TENANT_ID);
    return ResponseDto.success(result);
  }

  // ─── Documents ─────────────────────────────────

  @Post(':id/documents')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Upload application document' })
  async uploadDocument(@Param('id') id: string, @Body() body: unknown) {
    const dto = uploadDocumentSchema.parse(body);
    const result = await this.svc.uploadDocument(id, dto, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/documents/:documentId/verify')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Verify application document' })
  async verifyDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    await this.svc.verifyDocument(id, documentId, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, documentId, verified: true });
  }

  @Post(':id/documents/:documentId/reject')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Reject application document' })
  async rejectDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    const dto = rejectDocumentSchema.parse(body);
    await this.svc.rejectDocument(id, documentId, dto.reason, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, documentId, rejected: true });
  }

  // ─── Counselling ───────────────────────────────

  @Post(':id/counselling')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Schedule counselling session' })
  async scheduleCounselling(@Param('id') id: string, @Body() body: unknown) {
    const dto = scheduleCounsellingSchema.parse(body);
    const result = await this.svc.scheduleCounselling(id, dto, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/counselling/:sessionId/complete')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Complete counselling session with recommendation' })
  async completeCounselling(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ) {
    const dto = completeCounsellingSchema.parse(body);
    await this.svc.completeCounselling(id, sessionId, dto.recommendation, dto.notes, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, sessionId, completed: true });
  }

  // ─── Approval ──────────────────────────────────

  @Post(':id/approve')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Approve application and create admission record' })
  async approve(@Param('id') id: string, @Body() body: unknown) {
    const dto = recordApprovalSchema.parse(body);
    const result = await this.svc.approveApplication(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  // ─── Offer ─────────────────────────────────────

  @Post(':id/offers')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Issue admission offer letter' })
  async issueOffer(@Param('id') id: string, @Body() body: unknown) {
    const dto = issueOfferSchema.parse(body);
    const result = await this.svc.issueOffer(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/offers/:offerId/accept')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Accept admission offer' })
  async acceptOffer(@Param('id') id: string, @Param('offerId') offerId: string) {
    await this.svc.acceptOffer(id, offerId, TENANT_ID);
    return ResponseDto.success({ id, offerId, accepted: true });
  }

  @Post(':id/offers/:offerId/decline')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Decline admission offer' })
  async declineOffer(@Param('id') id: string, @Param('offerId') offerId: string) {
    await this.svc.declineOffer(id, offerId, TENANT_ID);
    return ResponseDto.success({ id, offerId, declined: true });
  }

  // ─── Age verification ──────────────────────────

  @Post(':id/age-verification')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Perform age eligibility verification' })
  async performAgeVerification(@Param('id') id: string, @Body() body: unknown) {
    const dto = ageVerificationSchema.parse(body);
    const result = await this.svc.performAgeVerification(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  // ─── Fee plan quote ────────────────────────────

  @Post(':id/fee-quote')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Set fee plan quote for application' })
  async setFeePlanQuote(@Param('id') id: string, @Body() body: unknown) {
    const dto = feePlanQuoteSchema.parse(body);
    const result = await this.svc.setFeePlanQuote(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  // ─── Priority factors ──────────────────────────

  @Post(':id/priority-factors')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Add admission priority factor' })
  async addPriorityFactor(@Param('id') id: string, @Body() body: unknown) {
    const dto = addPriorityFactorSchema.parse(body);
    const result = await this.svc.addPriorityFactor(id, dto.factor, dto.weight, dto.evidenceUrl, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/priority-factors/:priorityId/verify')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Verify priority factor' })
  async verifyPriorityFactor(@Param('id') id: string, @Param('priorityId') priorityId: string) {
    await this.svc.verifyPriorityFactor(id, priorityId, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, priorityId, verified: true });
  }

  // ─── Sibling concession ────────────────────────

  @Post(':id/sibling-concession')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Record sibling concession' })
  async recordSiblingConcession(@Param('id') id: string, @Body() body: unknown) {
    const dto = siblingConcessionSchema.parse(body);
    await this.svc.recordSiblingConcession(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, recorded: true });
  }

  @Post(':id/sibling-concession/verify')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Verify sibling concession' })
  async verifySiblingConcession(@Param('id') id: string) {
    await this.svc.verifySiblingConcession(id, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, verified: true });
  }

  // ─── Waitlist ──────────────────────────────────

  @Post(':id/waitlist')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Add application to waiting list' })
  async waitlist(@Param('id') id: string) {
    const result = await this.svc.waitlistApplication(id, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }
}

@ApiTags('admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly svc: AdmissionsService) {}

  @Get()
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'List admission records (paginated)' })
  async list(@Query() query: Record<string, string>) {
    const parsed = listAdmissionsQuerySchema.parse({
      ...query,
      page: query.page ?? '1',
      pageSize: query.pageSize ?? '20',
    });
    const result = await this.svc.listAdmissions({ tenantId: TENANT_ID, ...parsed }, parsed.page, parsed.pageSize);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'Get admission by ID' })
  async get(@Param('id') id: string) {
    const result = await this.svc.getAdmission(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/cancel')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Cancel admission (with refund calculation)' })
  async cancel(@Param('id') id: string, @Body() body: unknown) {
    const dto = cancelAdmissionSchema.parse(body);
    await this.svc.cancelAdmission(id, dto.reason, dto.refundDueCents, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, cancelled: true });
  }
}

@ApiTags('admissions')
@Controller('admissions/waitlist')
export class WaitingListController {
  constructor(private readonly svc: AdmissionsService) {}

  @Get()
  @Permissions('admissions.read.execute')
  @ApiOperation({ summary: 'List waiting list entries' })
  async list(
    @Query('branchId') branchId: string,
    @Query('programType') programType: string,
    @Query('academicSessionId') academicSessionId: string,
  ) {
    const result = await this.svc.listWaitingList(TENANT_ID, branchId, programType, academicSessionId);
    return ResponseDto.success(result);
  }

  @Post(':id/offer')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Offer a seat from waiting list' })
  async offerSeat(@Param('id') id: string, @Body() body: unknown) {
    const dto = offerSeatSchema.parse(body);
    await this.svc.offerWaitingListSeat(id, dto.expiresAt, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, offered: true });
  }

  @Post(':id/accept')
  @Permissions('admissions.update.execute')
  @ApiOperation({ summary: 'Accept waiting list seat offer' })
  async acceptSeat(@Param('id') id: string) {
    await this.svc.acceptWaitingListSeat(id, TENANT_ID);
    return ResponseDto.success({ id, accepted: true });
  }
}
