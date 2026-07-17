/**
 * UploadsService — Wave 19 orchestrates the upload pipeline.
 *
 * Flow:
 *   presign(req) → UploadsAggregate.create() → persist + return presigned URL
 *   complete(uploadId) → mark UPLOADED → enqueue background processing
 *   processBackground(uploadId) →
 *     1. startScanning() → ClamAvScanner.scanObject()
 *     2. if infected → markInfected() (terminal)
 *     3. startProcessing() → if IMAGE: SharpThumbnailer.generateThumbnails()
 *                          → if VIDEO: HlsTranscoder.transcode()
 *     4. markReady() with thumbnail/hls object keys
 *
 * Status retrieval via getStatus(uploadId).
 *
 * Persistence: UploadsService stores aggregates in an in-process Map for
 * v1. For production, swap with a PrismaUploadsRepository + uploads table.
 */
import { Injectable, Logger } from '@nestjs/common';

import { S3Service } from '../../../../infrastructure/s3/s3.service';
import { UploadsAggregate } from '../../domain/uploads.aggregate';
import {
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_SIZE_BYTES,
  UPLOAD_PRESIGN_EXPIRY_SECONDS,
  type UploadPresignResponse,
  type UploadRequest,
  type UploadStatusResponse,
  folderForPurpose,
} from '../../uploads.types';
import { ClamAvScanner } from './clamav-scanner.service';
import { HlsTranscoder } from './hls-transcoder.service';
import { SharpThumbnailer } from './sharp-thumbnailer.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  /** v1 in-process store — swap for Prisma repository in production. */
  private readonly store = new Map<string, UploadsAggregate>();

  constructor(
    private readonly s3: S3Service,
    private readonly scanner: ClamAvScanner,
    private readonly thumbnailer: SharpThumbnailer,
    private readonly hls: HlsTranscoder,
  ) {}

  async presign(req: UploadRequest): Promise<UploadPresignResponse> {
    if (req.sizeBytes > UPLOAD_MAX_SIZE_BYTES) {
      throw new Error(`File size ${req.sizeBytes} exceeds max ${UPLOAD_MAX_SIZE_BYTES}`);
    }
    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(req.contentType)) {
      throw new Error(`MIME type ${req.contentType} not allowed`);
    }

    const folder = folderForPurpose(req.purpose, req.tenantId);
    const presignResult = await this.s3.generateUploadUrl({
      folder,
      fileName: req.fileName,
      contentType: req.contentType,
    });
    const expiresAt = new Date(Date.now() + UPLOAD_PRESIGN_EXPIRY_SECONDS * 1000).toISOString();

    const aggregate = UploadsAggregate.create(req, presignResult.objectKey, expiresAt);
    this.store.set(aggregate.id, aggregate);

    return {
      uploadId: aggregate.id,
      uploadUrl: presignResult.uploadUrl,
      objectKey: presignResult.objectKey,
      expiresAt,
      maxSizeBytes: UPLOAD_MAX_SIZE_BYTES,
    };
  }

  async complete(uploadId: string, tenantId: string): Promise<{ status: FileStatusLike }> {
    const agg = this.findOwned(uploadId, tenantId);
    agg.markUploaded();
    // Kick off background processing — in v1 we run it inline (no queue)
    // so the controller can return immediately. Production: enqueue BullMQ job.
    void this.processBackground(uploadId).catch((err) => {
      this.logger.warn(`Background processing failed for ${uploadId}: ${(err as Error).message}`);
    });
    return { status: agg.status };
  }

  async getStatus(uploadId: string, tenantId: string): Promise<UploadStatusResponse> {
    const agg = this.findOwned(uploadId, tenantId);
    const [thumbnailUrl, originalUrl, hlsUrl] = await Promise.all([
      agg._props.thumbnailObjectKey
        ? this.s3.generateDownloadUrl(agg._props.thumbnailObjectKey)
        : Promise.resolve(undefined),
      this.s3.generateDownloadUrl(agg._props.objectKey),
      agg._props.hlsPlaylistObjectKey
        ? this.s3.generateDownloadUrl(agg._props.hlsPlaylistObjectKey)
        : Promise.resolve(undefined),
    ]);
    return {
      uploadId: agg.id,
      status: agg.status,
      kind: agg.kind,
      originalUrl,
      thumbnailUrl,
      hlsPlaylistUrl: hlsUrl,
      scanResult: agg._props.scanResult,
      failureReason: agg._props.failureReason,
      createdAt: agg._props.createdAt,
      updatedAt: agg._props.updatedAt,
    };
  }

  /**
   * Background pipeline — runs after the client confirms upload.
   * In production this would be a BullMQ job; for v1 it runs in-process.
   */
  async processBackground(uploadId: string): Promise<void> {
    const agg = this.store.get(uploadId);
    if (!agg || agg.status !== 'UPLOADED') return;

    // 1. Scan
    agg.startScanning();
    const scan = await this.scanner.scanObject(agg.objectKey);
    if (!scan.clean) {
      agg.markInfected(scan.signature ?? 'UNKNOWN');
      return;
    }

    // 2. Process (thumbnail or HLS)
    agg.startProcessing();
    try {
      if (agg.kind === 'IMAGE' && this.thumbnailer.available) {
        const thumbs = await this.thumbnailer.generateThumbnails(agg.objectKey);
        agg.markProcessed('thumbnail', thumbs.thumbnailObjectKey);
        agg.markReady({ thumbnailObjectKey: thumbs.thumbnailObjectKey });
      } else if (agg.kind === 'VIDEO' && this.hls.available) {
        const hls = await this.hls.transcode(agg.objectKey);
        agg.markProcessed('hls', hls.hlsPlaylistObjectKey);
        agg.markReady({ hlsPlaylistObjectKey: hls.hlsPlaylistObjectKey });
      } else {
        // No post-processing required (DOCUMENT / AUDIO / OTHER or stubbed tools)
        agg.markReady({});
      }
    } catch (err) {
      agg.fail((err as Error).message);
    }
  }

  private findOwned(uploadId: string, tenantId: string): UploadsAggregate {
    const agg = this.store.get(uploadId);
    if (!agg) throw new Error(`Upload ${uploadId} not found`);
    if (agg.tenantId !== tenantId) throw new Error(`Upload ${uploadId} not owned by tenant ${tenantId}`);
    return agg;
  }
}

type FileStatusLike = import('../../uploads.types').FileStatus;
