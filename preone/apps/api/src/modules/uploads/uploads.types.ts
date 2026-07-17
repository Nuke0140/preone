/**
 * Uploads module — Wave 19 types.
 *
 * Pipeline:
 *   1. Client requests presigned upload URL (POST /uploads/presign)
 *   2. Client uploads directly to S3
 *   3. Client notifies API (POST /uploads/:id/complete)
 *   4. API kicks off background processing:
 *      a. ClamAV virus scan
 *      b. Sharp image thumbnails (if image/*)
 *      c. HLS transcoding (if video/*) — ffmpeg via child_process
 *   5. Status available via GET /uploads/:id
 *
 * File states: PENDING → UPLOADED → SCANNING → PROCESSING → READY
 *                  ↓           ↓          ↓           ↓
 *                EXPIRED    REJECTED   INFECTED    FAILED
 */
export type FileKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER';

export type FileStatus =
  | 'PENDING'      // presigned URL issued, client has not uploaded yet
  | 'UPLOADED'     // client confirmed upload
  | 'SCANNING'     // ClamAV scan in progress
  | 'PROCESSING'   // Sharp thumbnails / HLS transcoding in progress
  | 'READY'        // fully processed + ready for use
  | 'EXPIRED'      // presigned URL expired without upload
  | 'REJECTED'     // upload rejected (mime/size/content-type mismatch)
  | 'INFECTED'     // ClamAV detected a virus
  | 'FAILED';      // processing pipeline failed

export interface UploadRequest {
  tenantId: string;
  userId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Where the file will be used — determines folder + post-processing. */
  purpose: 'student-photo' | 'student-document' | 'announcement-attachment' | 'portfolio-item' | 'lesson-resource' | 'invoice-pdf' | 'other';
}

export interface UploadPresignResponse {
  uploadId: string;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  maxSizeBytes: number;
}

export interface UploadStatusResponse {
  uploadId: string;
  status: FileStatus;
  kind: FileKind;
  originalUrl?: string;
  thumbnailUrl?: string;
  hlsPlaylistUrl?: string;
  scanResult?: { clean: boolean; signature?: string; scannedAt: string };
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const UPLOAD_MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const UPLOAD_PRESIGN_EXPIRY_SECONDS = 15 * 60; // 15 min
export const UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/mp4',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export function classifyFileKind(contentType: string): FileKind {
  if (contentType.startsWith('image/')) return 'IMAGE';
  if (contentType.startsWith('video/')) return 'VIDEO';
  if (contentType.startsWith('audio/')) return 'AUDIO';
  if (contentType.startsWith('application/') || contentType === 'text/plain') return 'DOCUMENT';
  return 'OTHER';
}

/** Folder prefix per purpose — used by S3Service.generateUploadUrl({ folder }). */
export function folderForPurpose(purpose: UploadRequest['purpose'], tenantId: string): string {
  return `tenants/${tenantId}/${purpose}`;
}
