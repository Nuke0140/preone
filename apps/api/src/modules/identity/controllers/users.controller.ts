/** UsersController — stub. Will be implemented when user management APIs are built. */
import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

@ApiTags('identity')
@Controller('users')
export class UsersController {
  @Get()
  @Permissions('users.read.execute')
  async list() { return ResponseDto.success({ items: [], total: 0, message: 'TODO' }); }

  @Get(':id')
  @Permissions('users.read.execute')
  async get(@Param('id') id: string) { return ResponseDto.success({ id, message: 'TODO' }); }

  @Post()
  @Permissions('users.create.execute')
  async create(@Body() dto: unknown) { return ResponseDto.success({ id: 'usr_new', message: 'TODO' }); }

  @Patch(':id')
  @Permissions('users.update.execute')
  async update(@Param('id') id: string, @Body() dto: unknown) { return ResponseDto.success({ id, message: 'TODO' }); }

  @Delete(':id')
  @Permissions('users.delete.execute')
  async delete(@Param('id') id: string) { return ResponseDto.success({ deleted: true, message: 'TODO' }); }
}
