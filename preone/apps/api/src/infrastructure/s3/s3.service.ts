/**
 * S3Service — AWS S3 client wrapper with pre-signed URL helpers.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { AppConfig } from '@config/env/app-config.type';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly presignExpiry: number;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.bucket = config.get('s3.bucket', { infer: true });
    this.presignExpiry = config.get('s3.presignExpiry', { infer: true });
    this.client = new S3Client({
      region: config.get('s3.region', { infer: true }),
      credentials: {
        accessKeyId: config.get('s3.accessKeyId', { infer: true }),
        secretAccessKey: config.get('s3.secretAccessKey', { infer: true }),
      },
      endpoint: config.get('s3.endpoint', { infer: true }) ?? undefined,
      forcePathStyle: config.get('s3.forcePathStyle', { infer: true }),
    });
  }

  /**
   * Generate a pre-signed PUT URL for direct browser upload.
   * The client uploads directly to S3 — API server is bypassed.
   */
  async generateUploadUrl(opts: {
    folder: string; // e.g., 'students/{studentId}/photos'
    fileName: string;
    contentType: string;
    maxSizeBytes?: number;
  }): Promise<{ uploadUrl: string; objectKey: string; expiresAt: Date }> {
    const ext = extname(opts.fileName);
    const objectKey = `${opts.folder}/${randomUUID()}${ext}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: opts.contentType,
      // Note: max size enforced via S3 bucket policy, not pre-signed URL
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: this.presignExpiry,
    });
    return {
      uploadUrl,
      objectKey,
      expiresAt: new Date(Date.now() + this.presignExpiry * 1000),
    };
  }

  /**
   * Generate a pre-signed GET URL for temporary download access.
   */
  async generateDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds ?? this.presignExpiry,
    });
  }

  /**
   * Delete an object (soft-delete in DB → cron hard-deletes S3 after retention).
   */
  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  /**
   * Check if object exists.
   */
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
