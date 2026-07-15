/**
 * S3Module — AWS S3 (or MinIO for local dev) wiring.
 *
 * Per ADR-111: Object storage for files (photos, documents, backups).
 * Pre-signed URLs for direct browser upload → reduces API load.
 */
import { Global, Module } from '@nestjs/common';

import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
