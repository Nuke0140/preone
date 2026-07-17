/**
 * UploadsController — Wave 19 HTTP endpoints.
 *
 *   POST /uploads/presign              — get presigned upload URL
 *   POST /uploads/:uploadId/complete   — notify upload complete (triggers scan+process)
 *   GET  /uploads/:uploadId            — get upload status + URLs
 *
 * All endpoints require JWT auth; tenantId is extracted from the JWT.
 */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../app/guards/jwt-auth.guard';
import { UploadsService } from '../application/services/uploads.service';
import type { UploadRequest } from '../uploads.types';

@ApiTags('Uploads')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned S3 upload URL' })
  async presign(
    @Req() req: Request,
    @Body() body: Omit<UploadRequest, 'tenantId' | 'userId'>,
  ) {
    const user = (req as unknown as { user?: { sub?: string; tenantId?: string } }).user;
    return this.uploads.presign({
      ...body,
      tenantId: user?.tenantId ?? 'unknown',
      userId: user?.sub ?? 'anonymous',
    });
  }

  @Post(':uploadId/complete')
  @ApiOperation({ summary: 'Notify that the client has finished uploading to S3' })
  async complete(
    @Req() req: Request,
    @Param('uploadId') uploadId: string,
  ) {
    const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId ?? 'unknown';
    return this.uploads.complete(uploadId, tenantId);
  }

  @Get(':uploadId')
  @ApiOperation({ summary: 'Get upload status (PENDING → READY / FAILED)' })
  async status(
    @Req() req: Request,
    @Param('uploadId') uploadId: string,
  ) {
    const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId ?? 'unknown';
    return this.uploads.getStatus(uploadId, tenantId);
  }
}
