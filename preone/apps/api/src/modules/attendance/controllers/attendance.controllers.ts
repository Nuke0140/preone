/**
 * Attendance Controllers — REST endpoints for the Attendance module.
 *
 * Per BTD §4.3 Module Catalog #6:
 *   "attendance — Daily Attendance, Arrival, Pickup — ~35 APIs"
 *
 * Controllers:
 *   1. AttendanceController   — Mark/correct/list attendance + arrival/pickup
 *   2. DailyLogsController    — Meal/nap/toilet/mood/water/medicine logs + medicine auth
 *   3. IncidentsController    — Incident reports + actions + escalation
 *   4. DailyReportsController — End-of-day compiled reports
 */
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  addHighlightSchema, addIncidentActionSchema, completeIncidentActionSchema,
  correctAttendanceSchema, createIncidentSchema, escalateIncidentSchema,
  generateDailyReportSchema, grantMedicineAuthorizationSchema,
  listAttendanceQuerySchema, listIncidentsQuerySchema, logArrivalSchema,
  logPickupSchema, markAttendanceSchema, markBulkAttendanceSchema,
  recordDailyLogSchema, resolveIncidentSchema,
} from '../application/dto/attendance.dto';
import { AttendanceService } from '../application/services/attendance.service';

const TENANT_ID = 'system';
const ACTOR_ID = 'system';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Get()
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'List attendance records (paginated, filterable)' })
  async list(@Query() query: Record<string, string>) {
    const parsed = listAttendanceQuerySchema.parse({
      ...query,
      page: query.page ?? '1',
      pageSize: query.pageSize ?? '50',
    });
    const result = await this.svc.listAttendance({ tenantId: TENANT_ID, ...parsed }, parsed.page, parsed.pageSize);
    return ResponseDto.success(result);
  }

  @Get('classrooms/:classroomId/summary')
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'Get classroom attendance summary for a date' })
  async getClassroomSummary(@Param('classroomId') classroomId: string, @Query('date') date: string) {
    const result = await this.svc.getClassroomSummary(classroomId, date, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'Get attendance by ID' })
  async get(@Param('id') id: string) {
    const result = await this.svc.getAttendance(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('attendance.create.execute')
  @ApiOperation({ summary: 'Mark attendance for a single student' })
  async mark(@Body() body: unknown) {
    const dto = markAttendanceSchema.parse(body);
    const result = await this.svc.markAttendance(dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post('bulk')
  @Permissions('attendance.create.execute')
  @ApiOperation({ summary: 'Mark attendance for an entire classroom (bulk)' })
  async markBulk(@Body() body: unknown) {
    const dto = markBulkAttendanceSchema.parse(body);
    const result = await this.svc.markBulkAttendance(dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/correct')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Correct attendance (with reason + approval flow)' })
  async correct(@Param('id') id: string, @Body() body: unknown) {
    const dto = correctAttendanceSchema.parse(body);
    await this.svc.correctAttendance(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, corrected: true });
  }

  @Post(':id/arrival')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Log arrival (check-in)' })
  async logArrival(@Param('id') id: string, @Body() body: unknown) {
    const dto = logArrivalSchema.parse(body);
    await this.svc.logArrival(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, arrivalLogged: true });
  }

  @Post(':id/pickup')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Log pickup (check-out)' })
  async logPickup(@Param('id') id: string, @Body() body: unknown) {
    const dto = logPickupSchema.parse(body);
    await this.svc.logPickup(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, pickupLogged: true });
  }
}

@ApiTags('attendance')
@Controller('attendance/daily-logs')
export class DailyLogsController {
  constructor(private readonly svc: AttendanceService) {}

  @Post(':attendanceId')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Record a daily log entry (meal/nap/toilet/mood/water/medicine)' })
  async record(@Param('attendanceId') attendanceId: string, @Body() body: unknown) {
    const dto = recordDailyLogSchema.parse(body);
    const result = await this.svc.recordDailyLog(attendanceId, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }
}

@ApiTags('attendance')
@Controller('attendance/medicine-authorizations')
export class MedicineAuthorizationsController {
  constructor(private readonly svc: AttendanceService) {}

  @Post()
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Grant medicine administration authorization (parent → school)' })
  async grant(@Body() body: unknown) {
    const dto = grantMedicineAuthorizationSchema.parse(body);
    const result = await this.svc.grantMedicineAuthorization(
      // studentId will come from URL in a real app; for now in body too
      (body as { studentId: string }).studentId,
      dto,
      ACTOR_ID,
      TENANT_ID,
    );
    return ResponseDto.success(result);
  }
}

@ApiTags('attendance')
@Controller('attendance/incidents')
export class IncidentsController {
  constructor(private readonly svc: AttendanceService) {}

  @Get()
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'List incident reports (paginated, filterable)' })
  async list(@Query() query: Record<string, string>) {
    const parsed = listIncidentsQuerySchema.parse({
      ...query,
      page: query.page ?? '1',
      pageSize: query.pageSize ?? '20',
    });
    const result = await this.svc.listIncidents({ tenantId: TENANT_ID, ...parsed }, parsed.page, parsed.pageSize);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'Get incident by ID' })
  async get(@Param('id') id: string) {
    const result = await this.svc.getIncident(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('attendance.create.execute')
  @ApiOperation({ summary: 'Create incident report (within 1 hour SLA)' })
  async create(@Body() body: unknown) {
    const dto = createIncidentSchema.parse(body);
    const result = await this.svc.createIncident(dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/escalate')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Escalate incident severity' })
  async escalate(@Param('id') id: string, @Body() body: unknown) {
    const dto = escalateIncidentSchema.parse(body);
    await this.svc.escalateIncident(id, dto.toSeverity, dto.reason, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, escalated: true });
  }

  @Post(':id/actions')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Add follow-up action to incident' })
  async addAction(@Param('id') id: string, @Body() body: unknown) {
    const dto = addIncidentActionSchema.parse(body);
    const result = await this.svc.addIncidentAction(id, dto, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/actions/:actionId/complete')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Mark incident action as completed' })
  async completeAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() body: unknown,
  ) {
    const dto = completeIncidentActionSchema.parse(body);
    await this.svc.completeIncidentAction(id, actionId, dto.outcome, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, actionId, completed: true });
  }

  @Post(':id/notify-guardian')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Mark guardian notified (required for CRITICAL incidents)' })
  async notifyGuardian(@Param('id') id: string) {
    await this.svc.notifyIncidentGuardian(id, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, guardianNotified: true });
  }

  @Post(':id/resolve')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Resolve incident (requires ≥1 completed action + guardian notification for CRITICAL)' })
  async resolve(@Param('id') id: string, @Body() body: unknown) {
    const dto = resolveIncidentSchema.parse(body);
    await this.svc.resolveIncident(id, dto.resolutionNotes, ACTOR_ID, TENANT_ID);
    return ResponseDto.success({ id, resolved: true });
  }
}

@ApiTags('attendance')
@Controller('attendance/daily-reports')
export class DailyReportsController {
  constructor(private readonly svc: AttendanceService) {}

  @Get(':id')
  @Permissions('attendance.read.execute')
  @ApiOperation({ summary: 'Get daily report by ID' })
  async get(@Param('id') id: string) {
    const result = await this.svc.getDailyReport(id, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('attendance.create.execute')
  @ApiOperation({ summary: 'Generate daily report for an attendance record' })
  async generate(@Body('attendanceId') attendanceId: string, @Body() body: unknown) {
    const dto = generateDailyReportSchema.parse(body);
    const result = await this.svc.generateDailyReport(attendanceId, dto.summaries, ACTOR_ID, TENANT_ID);
    return ResponseDto.success(result);
  }

  @Post(':id/highlights')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Add highlight to daily report' })
  async addHighlight(@Param('id') id: string, @Body() body: unknown) {
    const dto = addHighlightSchema.parse(body);
    await this.svc.addDailyReportHighlight(id, dto.highlight, TENANT_ID);
    return ResponseDto.success({ id, highlightAdded: true });
  }

  @Post(':id/send')
  @Permissions('attendance.update.execute')
  @ApiOperation({ summary: 'Send daily report to parent' })
  async send(@Param('id') id: string) {
    await this.svc.sendDailyReport(id, TENANT_ID);
    return ResponseDto.success({ id, sent: true });
  }
}
