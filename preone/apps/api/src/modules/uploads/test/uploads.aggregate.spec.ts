/**
 * uploads.aggregate.spec.ts — Wave 19 unit tests for UploadsAggregate.
 */
import { describe, it, expect } from 'vitest';

import { UploadsAggregate } from '../domain/uploads.aggregate';
import type { UploadRequest } from '../uploads.types';

function makeReq(overrides: Partial<UploadRequest> = {}): UploadRequest {
  return {
    tenantId: 't1',
    userId: 'u1',
    fileName: 'photo.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    purpose: 'student-photo',
    ...overrides,
  };
}

describe('UploadsAggregate (Wave 19)', () => {
  it('starts in PENDING state', () => {
    const agg = UploadsAggregate.create(makeReq(), 'tenants/t1/x.jpg', new Date().toISOString());
    expect(agg.status).toBe('PENDING');
    expect(agg.kind).toBe('IMAGE');
    expect(agg.domainEvents).toHaveLength(1);
  });

  it('transitions PENDING → UPLOADED → SCANNING → PROCESSING → READY', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    agg.markUploaded();
    expect(agg.status).toBe('UPLOADED');
    agg.startScanning();
    expect(agg.status).toBe('SCANNING');
    agg.startProcessing();
    expect(agg.status).toBe('PROCESSING');
    agg.markReady({ thumbnailObjectKey: 'thumb.jpg' });
    expect(agg.status).toBe('READY');
    expect(agg._props.thumbnailObjectKey).toBe('thumb.jpg');
  });

  it('rejects invalid transitions', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    // Cannot go directly from PENDING to SCANNING
    expect(() => agg.startScanning()).toThrow(/Invalid transition/);
  });

  it('markInfected transitions to INFECTED terminal state', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    agg.markUploaded();
    agg.startScanning();
    agg.markInfected('EICAR-Test-Signature');
    expect(agg.status).toBe('INFECTED');
    expect(agg._props.scanResult?.clean).toBe(false);
    expect(agg._props.scanResult?.signature).toBe('EICAR-Test-Signature');
    // INFECTED is terminal — no further transitions
    expect(() => agg.startProcessing()).toThrow(/Cannot start processing|Invalid transition/);
  });

  it('reject() transitions to REJECTED terminal state with reason', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    agg.reject('MIME type not allowed');
    expect(agg.status).toBe('REJECTED');
    expect(agg._props.failureReason).toBe('MIME type not allowed');
  });

  it('fail() transitions to FAILED with reason', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    agg.markUploaded();
    agg.startScanning();
    agg.startProcessing();
    agg.fail('Sharp failed: corrupt image');
    expect(agg.status).toBe('FAILED');
    expect(agg._props.failureReason).toBe('Sharp failed: corrupt image');
  });

  it('expire() transitions to EXPIRED terminal state', () => {
    const agg = UploadsAggregate.create(makeReq(), 'k', new Date().toISOString());
    agg.expire();
    expect(agg.status).toBe('EXPIRED');
  });

  it('classifies VIDEO kind from contentType', () => {
    const agg = UploadsAggregate.create(
      makeReq({ contentType: 'video/mp4', purpose: 'lesson-resource' }),
      'k',
      new Date().toISOString(),
    );
    expect(agg.kind).toBe('VIDEO');
  });

  it('throws on oversized file at create()', () => {
    expect(() =>
      UploadsAggregate.create(
        makeReq({ sizeBytes: 200 * 1024 * 1024 }),
        'k',
        new Date().toISOString(),
      ),
    ).toThrow(/exceeds max/);
  });
});
