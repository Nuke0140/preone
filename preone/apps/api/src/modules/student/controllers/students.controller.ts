/**
 * StudentsController — Student lifecycle CRUD + state transitions.
 *
 * Per BTD §4.3 Module Catalog:
 *   "4. student — Student Lifecycle, Profiles, Guardians — ~55 APIs"
 *
 * Endpoints:
 *   GET    /v1/students                — List students (paginated, filterable)
 *   GET    /v1/students/:id            — Get student by ID
 *   POST   /v1/students                — Create new student
 *   PATCH  /v1/students/:id            — Update student profile
 *   POST   /v1/students/:id/enroll     — Enrol student in a section (PROSPECT → ACTIVE)
 *   POST   /v1/students/:id/promote    — Promote to next grade
 *   POST   /v1/students/:id/transfer   — Transfer to another branch
 *   POST   /v1/students/:id/withdraw   — Withdraw student
 *   POST   /v1/students/:id/graduate   — Graduate student
 *   POST   /v1/students/:id/reactivate — Reactivate withdrawn student
 *   POST   /v1/students/:id/guardians  — Add guardian to student
 *   DELETE /v1/students/:id/guardians/:guardianId — Remove guardian
 *   POST   /v1/students/:id/primary-guardian — Set primary guardian
 */
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  AddGuardianDto, CreateStudentDto, EnrollStudentDto, ListStudentsQueryDto,
  PromoteStudentDto, SetPrimaryGuardianDto, StudentResponseDto,
  StudentListItemDto, TransferStudentDto, UpdateStudentDto, WithdrawStudentDto,
} from '../application/dto/student.dto';
import { StudentService } from '../application/services/student.service';

@ApiTags('student')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentService) {}

  @Get()
  @Permissions('students.read.execute')
  @ApiOperation({ summary: 'List students (paginated, filterable)' })
  async list(@Query() query: ListStudentsQueryDto): Promise<ResponseDto<{
    items: StudentListItemDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>> {
    // tenantId will be populated by JwtAuthGuard from req.user — placeholder 'system'
    const result = await this.students.listStudents(query, 'system');
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('students.read.execute')
  @ApiOperation({ summary: 'Get student by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.getStudent(id);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('students.create.execute')
  @ApiOperation({ summary: 'Create new student' })
  async create(
    @Body() dto: CreateStudentDto,
    @Body('createdBy') createdBy?: string,
  ): Promise<ResponseDto<StudentResponseDto>> {
    // In a real implementation, tenantId and createdBy come from req.user.
    // For Wave 3 v1 we use 'system' as placeholder; Wave 3.1 will wire @ReqUser.
    const result = await this.students.createStudent(dto, 'system', createdBy ?? 'system');
    return ResponseDto.success(result);
  }

  @Patch(':id')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Update student profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.updateStudent(id, dto, 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/enroll')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Enrol student in a section (PROSPECT → ACTIVE)' })
  async enroll(
    @Param('id') id: string,
    @Body() dto: EnrollStudentDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.enrollStudent(id, dto, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/promote')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Promote student to next grade' })
  async promote(
    @Param('id') id: string,
    @Body() dto: PromoteStudentDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.promoteStudent(id, dto, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/transfer')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Transfer student to another branch' })
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferStudentDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.transferStudent(id, dto, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/withdraw')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Withdraw student (ACTIVE → WITHDRAWN)' })
  async withdraw(
    @Param('id') id: string,
    @Body() dto: WithdrawStudentDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.withdrawStudent(id, dto, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/graduate')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Graduate student (ACTIVE → GRADUATED)' })
  async graduate(@Param('id') id: string): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.graduateStudent(id, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/reactivate')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Reactivate withdrawn student (WITHDRAWN → ACTIVE)' })
  async reactivate(@Param('id') id: string): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.reactivateStudent(id, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/guardians')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Add guardian to student' })
  async addGuardian(
    @Param('id') id: string,
    @Body() dto: AddGuardianDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.addGuardian(id, dto, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Delete(':id/guardians/:guardianId')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Remove guardian from student' })
  async removeGuardian(
    @Param('id') id: string,
    @Param('guardianId') guardianId: string,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.removeGuardian(id, guardianId, 'system', 'system');
    return ResponseDto.success(result);
  }

  @Post(':id/primary-guardian')
  @Permissions('students.update.execute')
  @ApiOperation({ summary: 'Set primary guardian' })
  async setPrimaryGuardian(
    @Param('id') id: string,
    @Body() dto: SetPrimaryGuardianDto,
  ): Promise<ResponseDto<StudentResponseDto>> {
    const result = await this.students.setPrimaryGuardian(id, dto.guardianId, 'system', 'system');
    return ResponseDto.success(result);
  }
}
