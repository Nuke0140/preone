/**
 * Uploads domain events — Wave 19.
 */
import { DomainEvent, type DomainEventPayload } from '@shared/kernel/domain-event';

export class UploadRequestedEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  userId: string;
  fileName: string;
  contentType: string;
  purpose: string;
  objectKey: string;
  expiresAt: string;
}> {}

export class UploadUploadedEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  objectKey: string;
}> {}

export class UploadInfectedEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  signature: string;
  objectKey: string;
}> {}

export class UploadProcessedEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  processedKind: 'thumbnail' | 'hls';
  objectKey: string;
}> {}

export class UploadReadyEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  thumbnailObjectKey?: string;
  hlsPlaylistObjectKey?: string;
}> {}

export class UploadRejectedEvent extends DomainEvent<{
  uploadId: string;
  tenantId: string;
  reason: string;
}> {}

export type UploadDomainEvent =
  | UploadRequestedEvent
  | UploadUploadedEvent
  | UploadInfectedEvent
  | UploadProcessedEvent
  | UploadReadyEvent
  | UploadRejectedEvent;

export const UPLOAD_EVENTS = {
  UploadRequestedEvent,
  UploadUploadedEvent,
  UploadInfectedEvent,
  UploadProcessedEvent,
  UploadReadyEvent,
  UploadRejectedEvent,
} as const;

// Helper so consumers don't import DomainEventPayload directly
export type { DomainEventPayload };
