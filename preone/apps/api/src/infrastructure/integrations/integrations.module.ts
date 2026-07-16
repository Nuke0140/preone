/**
 * IntegrationsModule — wires the 8 external integration adapters + the
 * shared CircuitBreakerService (Wave 17).
 *
 * Provider selection is config-driven:
 *   SMS_PROVIDER=stub|twilio|msg91|gupshup   (default: stub)
 *   WHATSAPP_PROVIDER=stub|gupshup|360dialog|twilio
 *   EMAIL_PROVIDER=stub|ses|sendgrid|postmark
 *   PAYMENT_PROVIDER=stub|razorpay|stripe|cashfree
 *   BIOMETRIC_PROVIDER=stub|secugen|mantra|startek
 *   AI_LLM_PROVIDER=stub|openai|anthropic|azure|glm
 *   CLOUD_STORAGE_PROVIDER=stub|s3|gcs|azure|minio
 *   KYC_PROVIDER=stub|surepass|signzy|karza|hyperverge
 *
 * In Wave 17.0, all providers default to `stub`. Wave 17.1 will wire
 * real providers behind feature flags + tenant-level config.
 *
 * The module is @Global so any service in any bounded context can
 * inject any adapter without re-importing the module.
 */
import { Global, Module } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import { SmsAdapter, StubSmsProvider, SMS_PROVIDER, SMS_CONFIG } from './sms.adapter';
import { WhatsAppAdapter, StubWhatsAppProvider, WHATSAPP_PROVIDER, WHATSAPP_CONFIG } from './whatsapp.adapter';
import { EmailAdapter, StubEmailProvider, EMAIL_PROVIDER, EMAIL_CONFIG } from './email.adapter';
import { PaymentAdapter, StubPaymentProvider, PAYMENT_PROVIDER, PAYMENT_CONFIG } from './payment.adapter';
import { BiometricAdapter, StubBiometricProvider, BIOMETRIC_PROVIDER, BIOMETRIC_CONFIG } from './biometric.adapter';
import { AiLlmAdapter, StubAiLlmProvider, AI_LLM_PROVIDER, AI_LLM_CONFIG } from './ai-llm.adapter';
import { CloudStorageAdapter, StubCloudStorageProvider, CLOUD_STORAGE_PROVIDER, CLOUD_STORAGE_CONFIG } from './cloud-storage.adapter';
import { KycAdapter, StubKycProvider, KYC_PROVIDER, KYC_CONFIG } from './kyc.adapter';

@Global()
@Module({
  providers: [
    CircuitBreakerService,

    // SMS
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

    // WhatsApp
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

    // Email
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

    // Payment
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

    // Biometric
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

    // AI/LLM
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

    // Cloud Storage
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

    // KYC
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
    SmsAdapter,
    WhatsAppAdapter,
    EmailAdapter,
    PaymentAdapter,
    BiometricAdapter,
    AiLlmAdapter,
    CloudStorageAdapter,
    KycAdapter,
  ],
})
export class IntegrationsModule {}
