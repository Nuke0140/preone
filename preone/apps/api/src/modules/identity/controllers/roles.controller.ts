/**
 * RolesController — role CRUD + permission assignment.
 *
 * Per API Catalog §16.2:
 *   GET    /v1/roles              — List roles (system + tenant)
 *   GET    /v1/roles/system       — List system roles only
 *   GET    /v1/roles/:id          — Get role by ID
 *   POST   /v1/roles              — Create custom role
 *   PATCH  /v1/roles/:id          — Update role
 *   DELETE /v1/roles/:id          — Delete role (system blocked)
 *   POST   /v1/roles/:id/permissions — Grant permissions to role
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions, ReqUser, type AuthenticatedUser } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  CreateRoleDto, UpdateRoleDto, GrantPermissionsDto, RoleResponseDto,
} from '../application/dto/role.dto';
import { RoleService } from '../application/services/role.service';

@ApiTags('identity')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RoleService) {}

  @Get()
  @Permissions('roles.read.execute')
  @ApiOperation({ summary: 'List roles (system + tenant)' })
  async list(@ReqUser() user: AuthenticatedUser): Promise<ResponseDto<RoleResponseDto[]>> {
    const items = await this.roles.listRoles(user.tenantId);
    return ResponseDto.success(items);
  }

  @Get('system')
  @Permissions('roles.read.execute')
  @ApiOperation({ summary: 'List system roles only' })
  async listSystem(): Promise<ResponseDto<RoleResponseDto[]>> {
    const items = await this.roles.listSystemRoles();
    return ResponseDto.success(items);
  }

  @Get(':id')
  @Permissions('roles.read.execute')
  @ApiOperation({ summary: 'Get role by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<RoleResponseDto>> {
    const result = await this.roles.getRole(id);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('roles.create.execute')
  @ApiOperation({ summary: 'Create custom role' })
  async create(
    @ReqUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ): Promise<ResponseDto<RoleResponseDto>> {
    const result = await this.roles.createRole(dto, user.tenantId, user.id);
    return ResponseDto.success(result);
  }

  @Patch(':id')
  @Permissions('roles.update.execute')
  @ApiOperation({ summary: 'Update role' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ResponseDto<RoleResponseDto>> {
    const result = await this.roles.updateRole(id, dto);
    return ResponseDto.success(result);
  }

  @Delete(':id')
  @Permissions('roles.delete.execute')
  @ApiOperation({ summary: 'Delete role (system blocked)' })
  async delete(@Param('id') id: string): Promise<ResponseDto<{ deleted: true }>> {
    const result = await this.roles.deleteRole(id);
    return ResponseDto.success(result);
  }

  @Post(':id/permissions')
  @Permissions('roles.assign.execute')
  @ApiOperation({ summary: 'Grant permissions to role' })
  async grantPermissions(
    @ReqUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GrantPermissionsDto,
  ): Promise<ResponseDto<RoleResponseDto>> {
    const result = await this.roles.grantPermissions(id, dto, user.id);
    return ResponseDto.success(result);
  }
}
