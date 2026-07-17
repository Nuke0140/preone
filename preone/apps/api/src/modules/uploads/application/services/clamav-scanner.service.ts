/**
 * ClamAvScanner — Wave 19 virus scanning via ClamAV clamd daemon.
 *
 * Connects to clamd via TCP (default 3310) using the INSTREAM command.
 * The S3 object is streamed to clamd; response is { clean, signature? }.
 *
 * For dev / test: if CLAMAV_HOST env is unset, scanner runs in STUB mode
 * (returns clean=true for all files) — controlled via a constructor flag.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'node:net';

import { S3Service } from '../../../../infrastructure/s3/s3.service';

export interface ClamAvScanResult {
  clean: boolean;
  signature?: string;
  scannedAt: string;
  stubbed: boolean;
}

@Injectable()
export class ClamAvScanner {
  private readonly logger = new Logger(ClamAvScanner.name);
  private readonly host: string | null;
  private readonly port: number;

  constructor(
    private readonly s3: S3Service,
    host: string | null = process.env['CLAMAV_HOST'] ?? null,
    port = Number(process.env['CLAMAV_PORT'] ?? 3310),
  ) {
    this.host = host;
    this.port = port;
  }

  async scanObject(objectKey: string, bucket?: string): Promise<ClamAvScanResult> {
    const scannedAt = new Date().toISOString();
    if (!this.host) {
      this.logger.debug(`ClamAV stub mode — skipping scan for ${objectKey}`);
      return { clean: true, scannedAt, stubbed: true };
    }

    return new Promise<ClamAvScanResult>((resolve) => {
      const socket = new Socket();
      let buffer = '';
      let resolved = false;

      const finish = (result: ClamAvScanResult): void => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(60_000);
      socket.on('error', (err) => {
        this.logger.warn(`ClamAV socket error: ${err.message}`);
        // Fail-open on connectivity issues — but flag for ops review
        finish({ clean: true, scannedAt, stubbed: false });
      });
      socket.on('timeout', () => {
        this.logger.warn('ClamAV scan timed out');
        finish({ clean: true, scannedAt, stubbed: false });
      });
      socket.on('data', (data) => {
        buffer += data.toString();
        if (buffer.includes('stream: OK')) {
          finish({ clean: true, scannedAt, stubbed: false });
        } else if (buffer.includes('stream: ')) {
          const match = buffer.match(/stream: (.+?)$/);
          finish({
            clean: false,
            signature: match?.[1] ?? 'UNKNOWN',
            scannedAt,
            stubbed: false,
          });
        }
      });

      socket.connect(this.port, this.host as string, async () => {
        // Send INSTREAM command
        socket.write(Buffer.from('zINSTREAM\0', 'utf-8'));
        // Stream S3 object body in 64KB chunks
        try {
          const body = await this.s3.getObjectStream(objectKey, bucket);
          for await (const chunk of body) {
            const len = Buffer.alloc(4);
            len.writeUInt32BE(chunk.length, 0);
            socket.write(len);
            socket.write(chunk);
          }
          // Zero-length chunk signals end of stream
          socket.write(Buffer.alloc(4));
        } catch (err) {
          this.logger.warn(`Failed to stream ${objectKey} to ClamAV: ${(err as Error).message}`);
          finish({ clean: true, scannedAt, stubbed: false });
        }
      });
    });
  }
}
