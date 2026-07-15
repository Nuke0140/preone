/**
 * SchoolsController — School (tenant) CRUD + lifecycle.
 *
 * Per API Catalog §16.2:
 *   GET    /v1/schools             — List schools (platform admin)
 *   GET    /v1/schools/:id         — Get school by ID
 *   POST   /v1/schools             — Onboard new school (platform admin)
 *   PATCH  /v1/schools/:id         — Update school
 *   POST   /v1/schools/:id/activate — Activate school (TRIAL → ACTIVE)
 *   POST   /v1/schools/:id/suspend — Suspend school (ACTIVE → SUSPENDED)
 *   POST   /v1/schools/:id/reactivate — Reactivate school (SUSPENDED → ACTIVE)
 *   POST   /v1/schools/:id/cancel  — Cancel school
 *   POST   /v1/schools/:id/upgrade — Upgrade tier
 */
import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { Public } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  CreateSchoolDto, UpdateSchoolDto, SuspendSchoolDto, ListSchoolsQueryDto,
  SchoolResponseDto,
} from '../application/dto/school.dto';
import { SchoolTierDto } from '../application/dto/school.dto';
import { SchoolService } from '../application/services/school.service';
import { UserService } from '../application/services/user.service';

@ApiTags('identity')
@Controller('schools')
export class SchoolsController {
  constructor(
    private readonly schools: SchoolService,
    private readonly users: UserService,
  ) {}

  @Get()
  @Permissions('schools.read.execute')
  @ApiOperation({ summary: 'List schools (platform admin)' })
  async list(@Query() query: ListSchoolsQueryDto): Promise<ResponseDto<{
    items: SchoolResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>> {
    const result = await this.schools.listSchools(query);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('schools.read.execute')
  @ApiOperation({ summary: 'Get school by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.getSchool(id);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('schools.create.execute')
  @ApiOperation({ summary: 'Onboard new school (platform admin)' })
  async create(
    @Body() dto: CreateSchoolDto,
    @Body('createdBy') createdBy?: string,
  ): Promise<ResponseDto<SchoolResponseDto>> {
    // createdBy falls back to a system user (since platform admin = SUPER_ADMIN)
    const result = await this.schools.createSchool(dto, createdBy ?? 'system');
    return ResponseDto.success(result);
  }

  @Patch(':id')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Update school' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
  ): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.updateSchool(id, dto);
    return ResponseDto.success(result);
  }

  @Post(':id/activate')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Activate school (TRIAL → ACTIVE)' })
  async activate(@Param('id') id: string): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.activateSchool(id);
    return ResponseDto.success(result);
  }

  @Post(':id/suspend')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Suspend school (ACTIVE → SUSPENDED)' })
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendSchoolDto,
  ): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.suspendSchool(id, dto);
    return ResponseDto.success(result);
  }

  @Post(':id/reactivate')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Reactivate school (SUSPENDED → ACTIVE)' })
  async reactivate(@Param('id') id: string): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.reactivateSchool(id);
    return ResponseDto.success(result);
  }

  @Post(':id/cancel')
  @Permissions('schools.delete.execute')
  @ApiOperation({ summary: 'Cancel school (→ CANCELLED)' })
  async cancel(@Param('id') id: string): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.cancelSchool(id);
    return ResponseDto.success(result);
  }

  @Post(':id/upgrade')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Upgrade school tier' })
  async upgrade(
    @Param('id') id: string,
    @Body('tier') tier: SchoolTierDto,
  ): Promise<ResponseDto<SchoolResponseDto>> {
    const result = await this.schools.upgradeTier(id, tier);
    return ResponseDto.success(result);
  }
}
