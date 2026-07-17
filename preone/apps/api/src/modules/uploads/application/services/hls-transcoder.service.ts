/**
 * HlsTranscoder — Wave 19 HLS transcoding via ffmpeg child_process.
 *
 * Generates a 3-rendition HLS playlist (240p / 480p / 720p) from a
 * source video. Output: master.m3u8 + segment_*.ts files.
 *
 * ffmpeg must be installed in the runtime image. If not found, the
 * transcoder runs in STUB mode (returns stubbed playlist URL).
 *
 * Implementation:
 *   1. Stream S3 object to a temp file (ffmpeg requires seekable input)
 *   2. Run ffmpeg with -hls_time 6 -hls_playlist_type vod
 *   3. Upload all output files to S3 under <baseKey>/hls/
 *   4. Return master.m3u8 object key
 */
import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { S3Service } from '../../../../infrastructure/s3/s3.service';

export interface HlsTranscodeResult {
  hlsPlaylistObjectKey: string;
  segmentCount: number;
  stubbed: boolean;
}

@Injectable()
export class HlsTranscoder {
  private readonly logger = new Logger(HlsTranscoder.name);

  constructor(private readonly s3: S3Service) {}

  get available(): boolean {
    // ffmpeg availability is checked lazily on first call
    return process.env['FFMPEG_BIN'] !== 'disabled';
  }

  async transcode(objectKey: string): Promise<HlsTranscodeResult> {
    const baseKey = objectKey.replace(/\.[^.]+$/, '');
    const hlsPlaylistObjectKey = `${baseKey}/hls/master.m3u8`;

    if (!this.available) {
      this.logger.debug(`HLS transcoder stub mode — skipping ${objectKey}`);
      return { hlsPlaylistObjectKey, segmentCount: 0, stubbed: true };
    }

    const workDir = join(tmpdir(), `hls-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(workDir, { recursive: true });
    const inputFile = join(workDir, 'input.mp4');

    try {
      // 1. Download S3 object to temp file
      const stream = await this.s3.getObjectStream(objectKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      await writeFile(inputFile, Buffer.concat(chunks));

      // 2. Run ffmpeg — 3 renditions (240p / 480p / 720p)
      await new Promise<void>((resolve, reject) => {
        const args = [
          '-i', inputFile,
          // 240p
          '-map', '0:v', '-map', '0:a',
          '-s:v:0', '426x240', '-b:v:0', '400k', '-maxrate:v:0', '428k', '-bufsize:v:0', '600k',
          // 480p
          '-map', '0:v', '-map', '0:a',
          '-s:v:1', '854x480', '-b:v:1', '1000k', '-maxrate:v:1', '1068k', '-bufsize:v:1', '1500k',
          // 720p
          '-map', '0:v', '-map', '0:a',
          '-s:v:2', '1280x720', '-b:v:2', '2500k', '-maxrate:v:2', '2668k', '-bufsize:v:2', '3750k',
          // HLS options
          '-c:v', 'libx264', '-c:a', 'aac', '-ar', '48000',
          '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod',
          '-master_pl_name', 'master.m3u8',
          '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',
          '-hls_segment_filename', join(workDir, 'stream_%v/data_%03d.ts'),
          join(workDir, 'stream_%v.m3u8'),
        ];
        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
          else resolve();
        });
      });

      // 3. Upload all output files to S3 under <baseKey>/hls/
      const files = await readdir(workDir, { recursive: true });
      let segmentCount = 0;
      for (const file of files) {
        const filePath = join(workDir, file);
        const body = await readFile(filePath);
        const s3Key = `${baseKey}/hls/${file}`;
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
        await this.s3.putObject({ objectKey: s3Key, body, contentType });
        if (file.endsWith('.ts')) segmentCount += 1;
      }

      return { hlsPlaylistObjectKey, segmentCount, stubbed: false };
    } catch (err) {
      this.logger.warn(`HLS transcode failed for ${objectKey}: ${(err as Error).message}`);
      throw err;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => { /* ignore */ });
    }
  }
}
