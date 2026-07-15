/** RolesController — stub for role CRUD + permission assignment. */
import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

@ApiTags('identity')
@Controller('roles')
export class RolesController {
  @Get() @Permissions('roles.read.execute')
  async list() { return ResponseDto.success({ items: [], total: 0, message: 'TODO' }); }

  @Get(':id') @Permissions('roles.read.execute')
  async get(@Param('id') id: string) { return ResponseDto.success({ id, message: 'TODO' }); }

  @Post() @Permissions('roles.create.execute')
  async create(@Body() dto: unknown) { return ResponseDto.success({ id: 'role_new', message: 'TODO' }); }

  @Patch(':id') @Permissions('roles.update.execute')
  async update(@Param('id') id: string, @Body() dto: unknown) { return ResponseDto.success({ id, message: 'TODO' }); }

  @Delete(':id') @Permissions('roles.delete.execute')
  async delete(@Param('id') id: string) { return ResponseDto.success({ deleted: true, message: 'TODO' }); }

  @Post(':id/permissions') @Permissions('roles.assign.execute')
  async grantPermission(@Param('id') id: string, @Body() dto: unknown) {
    return ResponseDto.success({ roleId: id, granted: true, message: 'TODO' });
  }
}
