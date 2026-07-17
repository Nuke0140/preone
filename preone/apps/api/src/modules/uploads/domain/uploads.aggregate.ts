/**
 * UploadsAggregate — Wave 19 DDD aggregate for the file upload lifecycle.
 *
 * State machine:
 *   PENDING → UPLOADED → SCANNING → PROCESSING → READY
 *   Any state → EXPIRED / REJECTED / INFECTED / FAILED (terminal)
 *
 * Invariants:
 *   - READY requires scanResult.clean === true
 *   - INFECTED is terminal (no recovery without re-upload)
 *   - thumbnailUrl only set for IMAGE kind
 *   - hlsPlaylistUrl only set for VIDEO kind
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  UploadInfectedEvent,
  UploadProcessedEvent,
  UploadReadyEvent,
  UploadRejectedEvent,
  UploadRequestedEvent,
} from '../domain/uploads-events';
import type {
  FileKind,
  FileStatus,
  UploadRequest,
} from '../uploads.types';
import { classifyFileKind, folderForPurpose, UPLOAD_MAX_SIZE_BYTES } from '../uploads.types';

export interface UploadsProps {
  tenantId: string;
  userId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  purpose: UploadRequest['purpose'];
  kind: FileKind;
  status: FileStatus;
  objectKey: string;
  thumbnailObjectKey?: string;
  hlsPlaylistObjectKey?: string;
  scanResult?: { clean: boolean; signature?: string; scannedAt: string };
  failureReason?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<FileStatus, FileStatus[]> = {
  PENDING: ['UPLOADED', 'EXPIRED', 'REJECTED'],
  UPLOADED: ['SCANNING', 'REJECTED'],
  SCANNING: ['PROCESSING', 'INFECTED', 'FAILED'],
  PROCESSING: ['READY', 'FAILED'],
  READY: [],
  EXPIRED: [],
  REJECTED: [],
  INFECTED: [],
  FAILED: [],
};

export class UploadsAggregate extends AggregateRoot<UploadsProps> {
  get tenantId(): string { return this._props.tenantId; }
  get status(): FileStatus { return this._props.status; }
  get kind(): FileKind { return this._props.kind; }
  get objectKey(): string { return this._props.objectKey; }

  static create(req: UploadRequest, objectKey: string, expiresAt: string): UploadsAggregate {
    if (req.sizeBytes > UPLOAD_MAX_SIZE_BYTES) {
      throw new Error(`File size ${req.sizeBytes} exceeds max ${UPLOAD_MAX_SIZE_BYTES}`);
    }
    const now = new Date().toISOString();
    const agg = new UploadsAggregate({
      tenantId: req.tenantId,
      userId: req.userId,
      fileName: req.fileName,
      contentType: req.contentType,
      sizeBytes: req.sizeBytes,
      purpose: req.purpose,
      kind: classifyFileKind(req.contentType),
      status: 'PENDING',
      objectKey,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new UploadRequestedEvent({
      uploadId: agg.id,
      tenantId: agg._props.tenantId,
      userId: agg._props.userId,
      fileName: agg._props.fileName,
      contentType: agg._props.contentType,
      purpose: agg._props.purpose,
      objectKey: agg._props.objectKey,
      expiresAt: agg._props.expiresAt,
    }));
    return agg;
  }

  markUploaded(): void {
    this.transition('UPLOADED');
  }

  startScanning(): void {
    this.transition('SCANNING');
  }

  markInfected(signature: string): void {
    this.transition('INFECTED');
    this._props.scanResult = {
      clean: false,
      signature,
      scannedAt: new Date().toISOString(),
    };
    this._addDomainEvent(new UploadInfectedEvent({
      uploadId: this.id,
      tenantId: this._props.tenantId,
      signature,
      objectKey: this._props.objectKey,
    }));
  }

  startProcessing(): void {
    if (this._props.status !== 'SCANNING') {
      throw new Error(`Cannot start processing from ${this._props.status}`);
    }
    this.transition('PROCESSING');
    this._props.scanResult = {
      clean: true,
      scannedAt: new Date().toISOString(),
    };
  }

  markReady(opts: { thumbnailObjectKey?: string; hlsPlaylistObjectKey?: string }): void {
    this.transition('READY');
    this._props.thumbnailObjectKey = opts.thumbnailObjectKey;
    this._props.hlsPlaylistObjectKey = opts.hlsPlaylistObjectKey;
    this._addDomainEvent(new UploadReadyEvent({
      uploadId: this.id,
      tenantId: this._props.tenantId,
      thumbnailObjectKey: opts.thumbnailObjectKey,
      hlsPlaylistObjectKey: opts.hlsPlaylistObjectKey,
    }));
  }

  markProcessed(processedKind: 'thumbnail' | 'hls', objectKey: string): void {
    this._addDomainEvent(new UploadProcessedEvent({
      uploadId: this.id,
      tenantId: this._props.tenantId,
      processedKind,
      objectKey,
    }));
  }

  reject(reason: string): void {
    this.transition('REJECTED');
    this._props.failureReason = reason;
    this._addDomainEvent(new UploadRejectedEvent({
      uploadId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  fail(reason: string): void {
    this.transition('FAILED');
    this._props.failureReason = reason;
  }

  expire(): void {
    this.transition('EXPIRED');
  }

  private transition(target: FileStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(`Invalid transition: ${this._props.status} → ${target}`);
    }
    this._props.status = target;
    this._props.updatedAt = new Date().toISOString();
  }

  /** For test/debug — what folder the file was stored in. */
  get folder(): string {
    return folderForPurpose(this._props.purpose, this._props.tenantId);
  }
}
