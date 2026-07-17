/**
 * SharpThumbnailer — Wave 19 image thumbnail generation via Sharp.
 *
 * Generates 3 thumbnail sizes per source image:
 *   - thumb:  200x200 (square crop)
 *   - medium: 800x600 (aspect-fit)
 *   - large:  1600x1200 (aspect-fit)
 *
 * Output: JPEG (quality 80) written to S3 alongside the original.
 * Object key pattern: <original-folder>/<original-id>_thumb.jpg
 *
 * Sharp is an optional dependency — the package may not be installed in
 * the dev environment. This service gracefully degrades to a stub when
 * sharp import fails (controlled by `available` flag).
 */
import { Injectable, Logger } from '@nestjs/common';

import { S3Service } from '../../../../infrastructure/s3/s3.service';

export interface ThumbnailResult {
  thumbnailObjectKey: string;
  mediumObjectKey: string;
  largeObjectKey: string;
  stubbed: boolean;
}

@Injectable()
export class SharpThumbnailer {
  private readonly logger = new Logger(SharpThumbnailer.name);
  private sharpFn: typeof import('sharp') | null = null;

  constructor(private readonly s3: S3Service) {
    // Lazy-load sharp — avoids hard dependency at import time. Use a
    // function-typed alias so TypeScript treats the callable default export
    // as a function (workaround for sharp's CJS default-export shape).
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('sharp');
      this.sharpFn = (typeof mod === 'function' ? mod : mod.default) as typeof import('sharp');
    } catch {
      this.logger.warn('Sharp not installed — thumbnailer running in STUB mode');
    }
  }

  get available(): boolean {
    return this.sharpFn !== null;
  }

  async generateThumbnails(objectKey: string): Promise<ThumbnailResult> {
    const baseKey = objectKey.replace(/\.[^.]+$/, '');
    const thumbnailObjectKey = `${baseKey}_thumb.jpg`;
    const mediumObjectKey = `${baseKey}_medium.jpg`;
    const largeObjectKey = `${baseKey}_large.jpg`;

    if (!this.sharpFn) {
      // Stub mode — return placeholder keys without actually generating
      return { thumbnailObjectKey, mediumObjectKey, largeObjectKey, stubbed: true };
    }

    const stream = await this.s3.getObjectStream(objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const original = Buffer.concat(chunks);

    // Generate three sizes in parallel. sharpFn is the callable default export.
    const sharp = this.sharpFn as unknown as (input: Buffer) => import('sharp').Sharp;
    const [thumb, medium, large] = await Promise.all([
      sharp(original).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
      sharp(original).resize(800, 600, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer(),
      sharp(original).resize(1600, 1200, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer(),
    ]);

    await Promise.all([
      this.s3.putObject({ objectKey: thumbnailObjectKey, body: thumb, contentType: 'image/jpeg' }),
      this.s3.putObject({ objectKey: mediumObjectKey, body: medium, contentType: 'image/jpeg' }),
      this.s3.putObject({ objectKey: largeObjectKey, body: large, contentType: 'image/jpeg' }),
    ]);

    return { thumbnailObjectKey, mediumObjectKey, largeObjectKey, stubbed: false };
  }
}
