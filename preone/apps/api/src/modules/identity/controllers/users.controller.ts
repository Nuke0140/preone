/**
 * UsersController — User CRUD + role assignment.
 *
 * Per API Catalog §16.2:
 *   GET    /v1/users              — List users (paginated)
 *   GET    /v1/users/:id          — Get user by ID
 *   POST   /v1/users              — Create user (invite)
 *   PATCH  /v1/users/:id          — Update user
 *   DELETE /v1/users/:id          — Soft-delete user
 *   POST   /v1/users/:id/roles    — Replace user roles
 *
 * Per BRC v1.0 R-APR-001: user:manage permission required for all endpoints.
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions, ReqUser, type AuthenticatedUser } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  CreateUserDto, UpdateUserDto, ChangeUserRolesDto, ListUsersQueryDto,
  UserResponseDto, PaginatedUsersDto, UpdateMyProfileDto,
} from '../application/dto/user.dto';
import { UserService } from '../application/services/user.service';

@ApiTags('identity')
@Controller()
export class UsersController {
  constructor(private readonly users: UserService) {}

  // ─────── /me endpoints (self-service, no RBAC needed) ───────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@ReqUser() user: AuthenticatedUser): Promise<ResponseDto<UserResponseDto>> {
    const profile = await this.users.getMyProfile(user.id);
    return ResponseDto.success(profile);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @ReqUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const profile = await this.users.updateMyProfile(user.id, dto);
    return ResponseDto.success(profile);
  }

  // ─────── /users endpoints (RBAC: user:manage) ───────

  @Get('users')
  @Permissions('users.read.execute')
  @ApiOperation({ summary: 'List users (paginated)' })
  async list(
    @ReqUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<ResponseDto<PaginatedUsersDto>> {
    const result = await this.users.listUsers(query, user.tenantId);
    return ResponseDto.success(result);
  }

  @Get('users/:id')
  @Permissions('users.read.execute')
  @ApiOperation({ summary: 'Get user by ID' })
  async get(
    @ReqUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ResponseDto<UserResponseDto>> {
    const result = await this.users.getUser(id, user.tenantId);
    return ResponseDto.success(result);
  }

  @Post('users')
  @Permissions('users.create.execute')
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @ReqUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const result = await this.users.createUser(dto, user.tenantId, user.id);
    return ResponseDto.success(result);
  }

  @Patch('users/:id')
  @Permissions('users.update.execute')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @ReqUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const result = await this.users.updateUser(id, dto, user.tenantId);
    return ResponseDto.success(result);
  }

  @Delete('users/:id')
  @Permissions('users.delete.execute')
  @ApiOperation({ summary: 'Soft-delete user' })
  async delete(
    @ReqUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ResponseDto<{ deleted: true }>> {
    const result = await this.users.deleteUser(id, user.tenantId);
    return ResponseDto.success(result);
  }

  @Post('users/:id/roles')
  @Permissions('users.assign.execute')
  @ApiOperation({ summary: 'Replace user roles' })
  async changeRoles(
    @ReqUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeUserRolesDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const result = await this.users.changeUserRoles(id, dto, user.tenantId, user.id);
    return ResponseDto.success(result);
  }
}
