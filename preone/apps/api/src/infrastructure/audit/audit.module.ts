/**
 * AuditModule — provides AuditService as a global provider.
 *
 * Per BTD §20.5 — Audit Logging:
 *   "AuditService is a global provider consumed by AuditInterceptor,
 *    application services (for explicit audit calls), and scheduled jobs
 *    (for system-initiated operations)."
 *
 * The AuditInterceptor is registered as a global interceptor via
 * APP_INTERCEPTOR in AppModule — see app.module.ts.
 */
import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
