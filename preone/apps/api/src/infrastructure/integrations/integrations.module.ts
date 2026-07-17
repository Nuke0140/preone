/**
 * IntegrationsModule — wires the 8 external integration adapters + the
 * shared CircuitBreakerService (Wave 17) + real providers + tenant
 * config + feature flags (Wave 17.1).
 *
 * Provider selection is now three-tier (Wave 17.1):
 *   1. Tenant-level DB config (IntegrationProviderSetting) — wins.
 *   2. Global env config (*_PROVIDER + *_API_KEY env vars) — fallback.
 *   3. Stub — final fallback for dev/test.
 *
 * The real providers (RazorpayPaymentProvider, SendGridEmailProvider,
 * TwilioSmsProvider, OpenAiLlmProvider) are always registered. Each
 * adapter resolves at call time which provider to use, based on the
 * tenant context (if any) and the feature-flag state.
 *
 * The module is @Global so any service in any bounded context can
 * inject any adapter without re-importing the module.
 *
 * Feature-flag env vars (Wave 17.1):
 *   INTEGRATIONS_SMS_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_WHATSAPP_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_EMAIL_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_PAYMENT_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_BIOMETRIC_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_AI_LLM_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_CLOUD_STORAGE_LIVE=auto|enabled|disabled
 *   INTEGRATIONS_KYC_LIVE=auto|enabled|disabled
 *
 *   'auto'     — honour tenant-level config (default, fail-open)
 *   'enabled'  — real provider must be used (fail-closed if no creds)
 *   'disabled' — stub provider must be used (dev/test mode)
 */
import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '@infra/prisma/prisma.module';

import { CircuitBreakerService } from './circuit-breaker.service';
import { SmsAdapter, StubSmsProvider, SMS_PROVIDER, SMS_CONFIG, type SmsProviderPort } from './sms.adapter';
import { WhatsAppAdapter, StubWhatsAppProvider, WHATSAPP_PROVIDER, WHATSAPP_CONFIG, type WhatsAppProviderPort } from './whatsapp.adapter';
import { EmailAdapter, StubEmailProvider, EMAIL_PROVIDER, EMAIL_CONFIG, type EmailProviderPort } from './email.adapter';
import { PaymentAdapter, StubPaymentProvider, PAYMENT_PROVIDER, PAYMENT_CONFIG, type PaymentProviderPort } from './payment.adapter';
import { BiometricAdapter, StubBiometricProvider, BIOMETRIC_PROVIDER, BIOMETRIC_CONFIG, type BiometricProviderPort } from './biometric.adapter';
import { AiLlmAdapter, StubAiLlmProvider, AI_LLM_PROVIDER, AI_LLM_CONFIG, type AiLlmProviderPort } from './ai-llm.adapter';
import { CloudStorageAdapter, StubCloudStorageProvider, CLOUD_STORAGE_PROVIDER, CLOUD_STORAGE_CONFIG, type CloudStorageProviderPort } from './cloud-storage.adapter';
import { KycAdapter, StubKycProvider, KYC_PROVIDER, KYC_CONFIG, type KycProviderPort } from './kyc.adapter';

import { IntegrationFeatureFlagService } from './integration-feature-flag.service';
import { TenantIntegrationConfigService } from './tenant-integration-config.service';

import { RazorpayPaymentProvider } from './providers/razorpay-payment.provider';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';

/**
 * Registry tokens — each adapter can inject the registry to look up
 * a real provider by name (e.g., 'twilio' → TwilioSmsProvider).
 * This decouples the adapter from the concrete provider class.
 */
export const SMS_PROVIDER_REGISTRY = 'SMS_PROVIDER_REGISTRY';
export const EMAIL_PROVIDER_REGISTRY = 'EMAIL_PROVIDER_REGISTRY';
export const PAYMENT_PROVIDER_REGISTRY = 'PAYMENT_PROVIDER_REGISTRY';
export const AI_LLM_PROVIDER_REGISTRY = 'AI_LLM_PROVIDER_REGISTRY';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    CircuitBreakerService,
    IntegrationFeatureFlagService,
    TenantIntegrationConfigService,

    // ─── Real providers (always registered; adapter picks at call time) ──
    RazorpayPaymentProvider,
    SendGridEmailProvider,
    TwilioSmsProvider,
    OpenAiLlmProvider,

    // ─── Provider registries (name → provider instance) ──
    {
      provide: SMS_PROVIDER_REGISTRY,
      useFactory: (stub: StubSmsProvider, twilio: TwilioSmsProvider) => {
        const m = new Map<string, SmsProviderPort>();
        m.set('stub', stub);
        m.set('twilio', twilio);
        return m;
      },
      inject: [StubSmsProvider, TwilioSmsProvider],
    },
    {
      provide: EMAIL_PROVIDER_REGISTRY,
      useFactory: (stub: StubEmailProvider, sendgrid: SendGridEmailProvider) => {
        const m = new Map<string, EmailProviderPort>();
        m.set('stub', stub);
        m.set('sendgrid', sendgrid);
        m.set('ses', sendgrid); // alias — SES not yet implemented; SendGrid is API-compatible
        return m;
      },
      inject: [StubEmailProvider, SendGridEmailProvider],
    },
    {
      provide: PAYMENT_PROVIDER_REGISTRY,
      useFactory: (stub: StubPaymentProvider, razorpay: RazorpayPaymentProvider) => {
        const m = new Map<string, PaymentProviderPort>();
        m.set('stub', stub);
        m.set('razorpay', razorpay);
        return m;
      },
      inject: [StubPaymentProvider, RazorpayPaymentProvider],
    },
    {
      provide: AI_LLM_PROVIDER_REGISTRY,
      useFactory: (stub: StubAiLlmProvider, openai: OpenAiLlmProvider) => {
        const m = new Map<string, AiLlmProviderPort>();
        m.set('stub', stub);
        m.set('openai', openai);
        m.set('azure', openai); // alias — Azure OpenAI is OpenAI-compatible
        m.set('glm', openai);   // alias — Z.ai GLM is OpenAI-compatible
        return m;
      },
      inject: [StubAiLlmProvider, OpenAiLlmProvider],
    },

    // ─── Default providers (env-driven — used when no tenant ctx) ──
    StubSmsProvider,
    { provide: SMS_PROVIDER, useExisting: StubSmsProvider },
    {
      provide: SMS_CONFIG,
      useFactory: () => ({
        from: process.env.SMS_FROM ?? '+910000000000',
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET,
        senderId: process.env.SMS_SENDER_ID ?? 'PREONE',
      }),
    },
    SmsAdapter,

    // WhatsApp (no real provider yet — stub only)
    StubWhatsAppProvider,
    { provide: WHATSAPP_PROVIDER, useExisting: StubWhatsAppProvider },
    {
      provide: WHATSAPP_CONFIG,
      useFactory: () => ({
        apiKey: process.env.WHATSAPP_API_KEY,
        apiSecret: process.env.WHATSAPP_API_SECRET,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      }),
    },
    WhatsAppAdapter,

    StubEmailProvider,
    { provide: EMAIL_PROVIDER, useExisting: StubEmailProvider },
    {
      provide: EMAIL_CONFIG,
      useFactory: () => ({
        fromAddress: process.env.EMAIL_FROM ?? 'noreply@preone.in',
        fromName: process.env.EMAIL_FROM_NAME ?? 'PreOne',
        replyTo: process.env.EMAIL_REPLY_TO,
        apiKey: process.env.EMAIL_API_KEY,
        apiSecret: process.env.EMAIL_API_SECRET,
        region: process.env.EMAIL_REGION ?? 'ap-south-1',
      }),
    },
    EmailAdapter,

    StubPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: StubPaymentProvider },
    {
      provide: PAYMENT_CONFIG,
      useFactory: () => ({
        apiKey: process.env.PAYMENT_API_KEY,
        apiSecret: process.env.PAYMENT_API_SECRET,
        webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
        mode: (process.env.PAYMENT_MODE as 'test' | 'live') ?? 'test',
      }),
    },
    PaymentAdapter,

    // Biometric (no real provider yet — stub only)
    StubBiometricProvider,
    { provide: BIOMETRIC_PROVIDER, useExisting: StubBiometricProvider },
    {
      provide: BIOMETRIC_CONFIG,
      useFactory: () => ({
        deviceApiBaseUrl: process.env.BIOMETRIC_DEVICE_API_BASE_URL,
        apiKey: process.env.BIOMETRIC_API_KEY,
        tenantId: process.env.BIOMETRIC_TENANT_ID,
      }),
    },
    BiometricAdapter,

    StubAiLlmProvider,
    { provide: AI_LLM_PROVIDER, useExisting: StubAiLlmProvider },
    {
      provide: AI_LLM_CONFIG,
      useFactory: () => ({
        apiKey: process.env.AI_LLM_API_KEY,
        apiBaseUrl: process.env.AI_LLM_API_BASE_URL,
        defaultModel: process.env.AI_LLM_DEFAULT_MODEL ?? 'gpt-4o-mini',
        defaultEmbeddingModel: process.env.AI_LLM_DEFAULT_EMBEDDING_MODEL ?? 'text-embedding-3-small',
        defaultMaxTokens: Number(process.env.AI_LLM_DEFAULT_MAX_TOKENS ?? 2048),
      }),
    },
    AiLlmAdapter,

    StubCloudStorageProvider,
    { provide: CLOUD_STORAGE_PROVIDER, useExisting: StubCloudStorageProvider },
    {
      provide: CLOUD_STORAGE_CONFIG,
      useFactory: () => ({
        bucket: process.env.STORAGE_BUCKET ?? 'preone-uploads',
        region: process.env.STORAGE_REGION ?? 'ap-south-1',
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
        endpoint: process.env.STORAGE_ENDPOINT,
        publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? 'https://cdn.preone.in',
      }),
    },
    CloudStorageAdapter,

    StubKycProvider,
    { provide: KYC_PROVIDER, useExisting: StubKycProvider },
    {
      provide: KYC_CONFIG,
      useFactory: () => ({
        apiKey: process.env.KYC_API_KEY,
        apiSecret: process.env.KYC_API_SECRET,
        apiBaseUrl: process.env.KYC_API_BASE_URL,
        mode: (process.env.KYC_MODE as 'test' | 'live') ?? 'test',
      }),
    },
    KycAdapter,
  ],
  exports: [
    CircuitBreakerService,
    IntegrationFeatureFlagService,
    TenantIntegrationConfigService,
    SmsAdapter,
    WhatsAppAdapter,
    EmailAdapter,
    PaymentAdapter,
    BiometricAdapter,
    AiLlmAdapter,
    CloudStorageAdapter,
    KycAdapter,
    SMS_PROVIDER_REGISTRY,
    EMAIL_PROVIDER_REGISTRY,
    PAYMENT_PROVIDER_REGISTRY,
    AI_LLM_PROVIDER_REGISTRY,
  ],
})
export class IntegrationsModule {}
