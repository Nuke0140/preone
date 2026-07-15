/**
 * SchoolsController — School (tenant) CRUD.
 * Platform-admin only for create/list; tenant admin for read/update own.
 */
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

@ApiTags('identity')
@Controller('schools')
export class SchoolsController {
  @Get()
  @Permissions('schools.read.execute')
  @ApiOperation({ summary: 'List schools (admin only)' })
  async list(): Promise<ResponseDto<unknown>> {
    return ResponseDto.success({ items: [], total: 0, message: 'TODO — implement' });
  }

  @Get(':id')
  @Permissions('schools.read.execute')
  @ApiOperation({ summary: 'Get school by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<unknown>> {
    return ResponseDto.success({ id, message: 'TODO — implement' });
  }

  @Post()
  @ApiOperation({ summary: 'Onboard new school (platform admin)' })
  async create(@Body() dto: unknown): Promise<ResponseDto<unknown>> {
    return ResponseDto.success({ id: 'sch_new', message: 'TODO — implement' });
  }

  @Patch(':id')
  @Permissions('schools.update.execute')
  @ApiOperation({ summary: 'Update school' })
  async update(@Param('id') id: string, @Body() dto: unknown): Promise<ResponseDto<unknown>> {
    return ResponseDto.success({ id, updated: true, message: 'TODO — implement' });
  }
}
