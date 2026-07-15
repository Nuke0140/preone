/**
 * BranchesController — branch CRUD within a school.
 *
 * Per API Catalog §16.2:
 *   GET    /v1/branches             — List branches
 *   GET    /v1/branches/:id         — Get branch by ID
 *   POST   /v1/branches             — Create branch
 *   PATCH  /v1/branches/:id         — Update branch
 *   POST   /v1/branches/:id/deactivate — Deactivate branch
 */
import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions, ReqUser, type AuthenticatedUser } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  CreateBranchDto, UpdateBranchDto, ListBranchesQueryDto, BranchResponseDto,
} from '../application/dto/branch.dto';
import { BranchService } from '../application/services/branch.service';

@ApiTags('identity')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchService) {}

  @Get()
  @Permissions('branches.read.execute')
  @ApiOperation({ summary: 'List branches' })
  async list(
    @ReqUser() user: AuthenticatedUser,
    @Query() query: ListBranchesQueryDto,
  ): Promise<ResponseDto<{
    items: BranchResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>> {
    const result = await this.branches.listBranches(query, user.tenantId);
    return ResponseDto.success(result);
  }

  @Get(':id')
  @Permissions('branches.read.execute')
  @ApiOperation({ summary: 'Get branch by ID' })
  async get(@Param('id') id: string): Promise<ResponseDto<BranchResponseDto>> {
    const result = await this.branches.getBranch(id);
    return ResponseDto.success(result);
  }

  @Post()
  @Permissions('branches.create.execute')
  @ApiOperation({ summary: 'Create branch' })
  async create(
    @ReqUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ): Promise<ResponseDto<BranchResponseDto>> {
    const result = await this.branches.createBranch(dto, user.tenantId, user.id);
    return ResponseDto.success(result);
  }

  @Patch(':id')
  @Permissions('branches.update.execute')
  @ApiOperation({ summary: 'Update branch' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<ResponseDto<BranchResponseDto>> {
    const result = await this.branches.updateBranch(id, dto);
    return ResponseDto.success(result);
  }

  @Post(':id/deactivate')
  @Permissions('branches.update.execute')
  @ApiOperation({ summary: 'Deactivate branch' })
  async deactivate(@Param('id') id: string): Promise<ResponseDto<BranchResponseDto>> {
    const result = await this.branches.deactivateBranch(id);
    return ResponseDto.success(result);
  }
}
