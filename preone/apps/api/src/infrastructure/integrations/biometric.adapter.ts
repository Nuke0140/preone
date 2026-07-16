/**
 * BiometricAdapter — biometric device integration (Wave 17).
 *
 * Pluggable provider: in dev, uses a stub. In prod, the real provider
 * (e.g., SecuGen / Mantra / Startek / integrated device SDK HTTP gateway)
 * is injected via the `BIOMETRIC_PROVIDER` token.
 *
 * Two core operations:
 *   - captureAndVerify  — device captures a fingerprint/iris and matches
 *                          it against a stored template.
 *   - enrollTemplate    — capture + store a new template for a user.
 *
 * Biometric data is HIGHLY SENSITIVE. The adapter:
 *   - Never logs template data (only the captured template HASH at DEBUG).
 *   - Returns only a boolean match result + a confidence score.
 *   - Does NOT store templates in the application DB — they live in the
 *     device's secure enclave or a separate biometric vault.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface BiometricVerifyRequest {
  userId: string;
  /** Device-assigned capture session ID (the device captures, not us). */
  captureSessionId: string;
}

export interface BiometricVerifyResult {
  ok: boolean;
  matched?: boolean;
  confidenceScore?: number; // 0..100
  error?: string;
}

export interface BiometricEnrollRequest {
  userId: string;
  /** Device-assigned capture session ID for the enrollment template. */
  captureSessionId: string;
}

export interface BiometricEnrollResult {
  ok: boolean;
  templateHash?: string; // SHA-256 of the stored template — for audit
  error?: string;
}

export const BIOMETRIC_PROVIDER = 'BIOMETRIC_PROVIDER';
export const BIOMETRIC_CONFIG = 'BIOMETRIC_CONFIG';

export interface BiometricConfig {
  deviceApiBaseUrl?: string;
  apiKey?: string;
  tenantId?: string;
}

export interface BiometricProviderPort {
  readonly name: string;
  captureAndVerify(req: BiometricVerifyRequest, config: BiometricConfig): Promise<BiometricVerifyResult>;
  enrollTemplate(req: BiometricEnrollRequest, config: BiometricConfig): Promise<BiometricEnrollResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class BiometricAdapter implements ExternalProvider {
  readonly name = 'biometric';
  private readonly logger = new Logger(BiometricAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(BIOMETRIC_PROVIDER) private readonly provider: BiometricProviderPort,
    @Inject(BIOMETRIC_CONFIG) private readonly config: BiometricConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 15_000, // Biometric capture can take time
    });
  }

  async captureAndVerify(req: BiometricVerifyRequest): Promise<BiometricVerifyResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.captureAndVerify(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Biometric verify (user=${req.userId}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async enrollTemplate(req: BiometricEnrollRequest): Promise<BiometricEnrollResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.enrollTemplate(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Biometric enroll (user=${req.userId}) failed: ${(err as Error).message}`);
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
export class StubBiometricProvider implements BiometricProviderPort {
  readonly name = 'stub-biometric';
  private readonly logger = new Logger(StubBiometricProvider.name);

  async captureAndVerify(req: BiometricVerifyRequest, _config: BiometricConfig): Promise<BiometricVerifyResult> {
    this.logger.debug(`[STUB Biometric] verify user=${req.userId} session=${req.captureSessionId}`);
    // Always match with 95% confidence in stub mode.
    return { ok: true, matched: true, confidenceScore: 95 };
  }

  async enrollTemplate(req: BiometricEnrollRequest, _config: BiometricConfig): Promise<BiometricEnrollResult> {
    const templateHash = `sha256:stub-${req.userId}-${Date.now()}`;
    this.logger.debug(`[STUB Biometric] enroll user=${req.userId} session=${req.captureSessionId}`);
    return { ok: true, templateHash };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
