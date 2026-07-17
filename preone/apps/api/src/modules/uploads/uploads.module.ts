/**
 * UploadsModule — Wave 19 wiring.
 */
import { Module } from '@nestjs/common';

import { S3Module } from '../../infrastructure/s3/s3.module';

import { UploadsController } from './controllers/uploads.controller';
import { ClamAvScanner } from './application/services/clamav-scanner.service';
import { HlsTranscoder } from './application/services/hls-transcoder.service';
import { SharpThumbnailer } from './application/services/sharp-thumbnailer.service';
import { UploadsService } from './application/services/uploads.service';

@Module({
  imports: [S3Module],
  controllers: [UploadsController],
  providers: [UploadsService, ClamAvScanner, SharpThumbnailer, HlsTranscoder],
  exports: [UploadsService],
})
export class UploadsModule {}
