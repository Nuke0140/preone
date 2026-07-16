/**
 * KycAdapter — KYC (Know Your Customer) verification abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a stub. In prod, the real provider
 * (e.g., SurePass / Signzy / Karza / HyperVerge) is injected via the
 * `KYC_PROVIDER` token.
 *
 * Two core operations:
 *   - verifyAadhaar  — Aadhaar OTP / biometric verification.
 *   - verifyPan      — PAN lookup against NSDL.
 *
 * PII (Aadhaar numbers, PAN numbers) is HIGHLY SENSITIVE. The adapter:
 *   - Never logs full Aadhaar/PAN — only masked forms.
 *   - Returns only verification status + provider reference ID.
 *   - Does NOT persist the raw Aadhaar/PAN — only the masked form + a
 *     hash for de-duplication (per ERD v3.0 §5 PII policy).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface AadhaarVerifyRequest {
  aadhaarNumber: string;          // 12 digits
  /** 'OTP' = send OTP to the linked mobile; 'BIOMETRIC' = use BiometricAdapter. */
  mode: 'OTP' | 'BIOMETRIC';
  /** For OTP mode: a transaction ID from a prior `initiateOtp` call (not implemented here). */
  otpTransactionId?: string;
  /** For OTP mode: the 6-digit OTP the user entered. */
  otp?: string;
}

export interface AadhaarVerifyResult {
  ok: boolean;
  verified?: boolean;
  providerReferenceId?: string;
  /** Masked Aadhaar: XXXX-XXXX-1234 (last 4 only). */
  maskedAadhaar?: string;
  nameMatch?: boolean;
  error?: string;
}

export interface PanVerifyRequest {
  panNumber: string;             // 10 chars (ABCDE1234F)
  name: string;                  // Name to verify against NSDL
  dateOfBirth?: string;          // ISO date (optional — improves match)
}

export interface PanVerifyResult {
  ok: boolean;
  verified?: boolean;
  providerReferenceId?: string;
  nameMatch?: boolean;
  /** Masked PAN: ABCDE****F (middle 4 hidden). */
  maskedPan?: string;
  error?: string;
}

export const KYC_PROVIDER = 'KYC_PROVIDER';
export const KYC_CONFIG = 'KYC_CONFIG';

export interface KycConfig {
  apiKey?: string;
  apiSecret?: string;
  apiBaseUrl?: string;
  mode?: 'test' | 'live';
}

export interface KycProviderPort {
  readonly name: string;
  verifyAadhaar(req: AadhaarVerifyRequest, config: KycConfig): Promise<AadhaarVerifyResult>;
  verifyPan(req: PanVerifyRequest, config: KycConfig): Promise<PanVerifyResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class KycAdapter implements ExternalProvider {
  readonly name = 'kyc';
  private readonly logger = new Logger(KycAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(KYC_PROVIDER) private readonly provider: KycProviderPort,
    @Inject(KYC_CONFIG) private readonly config: KycConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 60,
      slowCallDurationMs: 15_000,
    });
  }

  async verifyAadhaar(req: AadhaarVerifyRequest): Promise<AadhaarVerifyResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.verifyAadhaar(req, this.config),
      );
    } catch (err) {
      this.logger.error(
        `KYC Aadhaar verify (mode=${req.mode}) failed: ${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }

  async verifyPan(req: PanVerifyRequest): Promise<PanVerifyResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.verifyPan(req, this.config),
      );
    } catch (err) {
      this.logger.error(`KYC PAN verify failed: ${(err as Error).message}`);
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

  /** Mask an Aadhaar number for logging — XXXX-XXXX-1234. */
  static maskAadhaar(aadhaar: string): string {
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length !== 12) return '****-****-****';
    return `XXXX-XXXX-${digits.slice(8)}`;
  }

  /** Mask a PAN for logging — ABCDE****F (middle 4 hidden). */
  static maskPan(pan: string): string {
    if (pan.length !== 10) return '**********';
    return `${pan.slice(0, 5)}****${pan.slice(9)}`;
  }
}

@Injectable()
export class StubKycProvider implements KycProviderPort {
  readonly name = 'stub-kyc';
  private readonly logger = new Logger(StubKycProvider.name);

  async verifyAadhaar(req: AadhaarVerifyRequest, _config: KycConfig): Promise<AadhaarVerifyResult> {
    this.logger.debug(
      `[STUB KYC] Aadhaar verify mode=${req.mode} masked=${KycAdapter.maskAadhaar(req.aadhaarNumber)}`,
    );
    return {
      ok: true,
      verified: true,
      providerReferenceId: `stub-aadhaar-${Date.now()}`,
      maskedAadhaar: KycAdapter.maskAadhaar(req.aadhaarNumber),
      nameMatch: true,
    };
  }

  async verifyPan(req: PanVerifyRequest, _config: KycConfig): Promise<PanVerifyResult> {
    this.logger.debug(
      `[STUB KYC] PAN verify masked=${KycAdapter.maskPan(req.panNumber)} name="${req.name}"`,
    );
    return {
      ok: true,
      verified: true,
      providerReferenceId: `stub-pan-${Date.now()}`,
      nameMatch: true,
      maskedPan: KycAdapter.maskPan(req.panNumber),
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
