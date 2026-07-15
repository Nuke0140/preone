/**
 * PermissionsController — permission catalog lookup.
 *
 * Per API Catalog §16.2:
 *   GET /v1/permissions        — List all permissions
 *   GET /v1/permissions/grouped — List permissions grouped by module
 *   GET /v1/permissions/:code  — Get permission by code
 *   GET /v1/permissions/module/:module — List by module
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import { PermissionService } from '../application/services/permission.service';

import type { PermissionResponseDto, PermissionGroupDto } from '../application/dto/permission.dto';

@ApiTags('identity')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionService) {}

  @Get()
  @Permissions('permissions.read.execute')
  @ApiOperation({ summary: 'List all permissions' })
  async list(): Promise<ResponseDto<PermissionResponseDto[]>> {
    const result = await this.permissions.listAll();
    return ResponseDto.success(result);
  }

  @Get('grouped')
  @Permissions('permissions.read.execute')
  @ApiOperation({ summary: 'List permissions grouped by module' })
  async listGrouped(): Promise<ResponseDto<PermissionGroupDto[]>> {
    const result = await this.permissions.listGrouped();
    return ResponseDto.success(result);
  }

  @Get('module/:module')
  @Permissions('permissions.read.execute')
  @ApiOperation({ summary: 'List permissions by module' })
  async listByModule(@Param('module') module: string): Promise<ResponseDto<PermissionResponseDto[]>> {
    const result = await this.permissions.listByModule(module);
    return ResponseDto.success(result);
  }

  @Get(':code')
  @Permissions('permissions.read.execute')
  @ApiOperation({ summary: 'Get permission by code' })
  async get(@Param('code') code: string): Promise<ResponseDto<PermissionResponseDto>> {
    const result = await this.permissions.getByCode(code);
    return ResponseDto.success(result);
  }
}
