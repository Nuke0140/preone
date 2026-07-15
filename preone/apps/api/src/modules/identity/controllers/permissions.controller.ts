/** PermissionsController — stub for permission catalog lookup. */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

@ApiTags('identity')
@Controller('permissions')
export class PermissionsController {
  @Get() @Permissions('permissions.read.execute')
  async list() { return ResponseDto.success({ items: [], total: 0, message: 'TODO' }); }

  @Get(':code') @Permissions('permissions.read.execute')
  async get(@Param('code') code: string) { return ResponseDto.success({ code, message: 'TODO' }); }
}
