/**
 * CloudStorageAdapter — object storage abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a local-filesystem stub. In prod, the
 * real provider (e.g., AWS S3 / GCP Cloud Storage / Azure Blob / MinIO)
 * is injected via the `CLOUD_STORAGE_PROVIDER` token.
 *
 * Three core operations:
 *   - upload       — upload bytes to a key, return a public or signed URL.
 *   - getSignedUrl — generate a time-limited download URL.
 *   - deleteObject — remove an object (used by retention policies).
 *
 * The adapter does NOT do content-type sniffing or virus scanning —
 * callers must validate uploads before calling upload().
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface UploadRequest {
  key: string;                  // e.g., "tenants/01HSCH/attendance/evidence/01HFILE.jpg"
  body: Buffer;
  contentType: string;          // e.g., "image/jpeg"
  cacheControl?: string;        // e.g., "max-age=31536000"
  metadata?: Record<string, string>;
  /** If true, return a CDN/signed URL; otherwise return the public URL. */
  signedUrl?: boolean;
  signedUrlExpirySeconds?: number;
}

export interface UploadResult {
  ok: boolean;
  key?: string;
  url?: string;                 // Public or signed URL
  etag?: string;
  sizeBytes?: number;
  error?: string;
}

export interface GetSignedUrlRequest {
  key: string;
  expirySeconds?: number;
  method?: 'GET' | 'PUT';
}

export interface GetSignedUrlResult {
  ok: boolean;
  url?: string;
  expiresAt?: string;
  error?: string;
}

export interface DeleteObjectRequest {
  key: string;
}

export interface DeleteObjectResult {
  ok: boolean;
  error?: string;
}

export const CLOUD_STORAGE_PROVIDER = 'CLOUD_STORAGE_PROVIDER';
export const CLOUD_STORAGE_CONFIG = 'CLOUD_STORAGE_CONFIG';

export interface CloudStorageConfig {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;           // For MinIO / R2
  publicBaseUrl?: string;      // CDN base URL
}

export interface CloudStorageProviderPort {
  readonly name: string;
  upload(req: UploadRequest, config: CloudStorageConfig): Promise<UploadResult>;
  getSignedUrl(req: GetSignedUrlRequest, config: CloudStorageConfig): Promise<GetSignedUrlResult>;
  deleteObject(req: DeleteObjectRequest, config: CloudStorageConfig): Promise<DeleteObjectResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class CloudStorageAdapter implements ExternalProvider {
  readonly name = 'cloud-storage';
  private readonly logger = new Logger(CloudStorageAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(CLOUD_STORAGE_PROVIDER) private readonly provider: CloudStorageProviderPort,
    @Inject(CLOUD_STORAGE_CONFIG) private readonly config: CloudStorageConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 20_000, // Large uploads can take time
    });
  }

  async upload(req: UploadRequest): Promise<UploadResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.upload(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Storage upload (key=${req.key}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async getSignedUrl(req: GetSignedUrlRequest): Promise<GetSignedUrlResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.getSignedUrl(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Storage getSignedUrl (key=${req.key}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async deleteObject(req: DeleteObjectRequest): Promise<DeleteObjectResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.deleteObject(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Storage deleteObject (key=${req.key}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async checkHealth(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const healthy = await this.provider.checkHealth();
      return {
        name: this.name,
        healthy,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        name: this.name,
        healthy: false,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        lastError: (err as Error).message,
      };
    }
  }
}

@Injectable()
export class StubCloudStorageProvider implements CloudStorageProviderPort {
  readonly name = 'stub-storage';
  private readonly logger = new Logger(StubCloudStorageProvider.name);
  private readonly stored = new Map<string, Buffer>();

  async upload(req: UploadRequest, config: CloudStorageConfig): Promise<UploadResult> {
    this.stored.set(req.key, req.body);
    const publicBase = config.publicBaseUrl ?? 'https://stub-cdn.preone.local';
    const url = req.signedUrl
      ? `${publicBase}/signed/${req.key}?expires=${Date.now() + (req.signedUrlExpirySeconds ?? 3600) * 1000}`
      : `${publicBase}/${req.key}`;
    this.logger.debug(`[STUB Storage] upload key=${req.key} size=${req.body.byteLength}`);
    return {
      ok: true,
      key: req.key,
      url,
      etag: `stub-etag-${Date.now()}`,
      sizeBytes: req.body.byteLength,
    };
  }

  async getSignedUrl(req: GetSignedUrlRequest, config: CloudStorageConfig): Promise<GetSignedUrlResult> {
    const publicBase = config.publicBaseUrl ?? 'https://stub-cdn.preone.local';
    const expiresAt = new Date(Date.now() + (req.expirySeconds ?? 3600) * 1000).toISOString();
    return {
      ok: true,
      url: `${publicBase}/signed/${req.key}?expires=${Date.now() + (req.expirySeconds ?? 3600) * 1000}`,
      expiresAt,
    };
  }

  async deleteObject(req: DeleteObjectRequest, _config: CloudStorageConfig): Promise<DeleteObjectResult> {
    this.stored.delete(req.key);
    return { ok: true };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
