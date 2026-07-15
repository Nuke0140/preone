/**
 * AppModule — root NestJS module wiring all 14 bounded contexts + infrastructure.
 *
 * Module list (per Backend TD §4.3):
 *   1.  identity      — Users, Roles, Permissions, Tenants, Branches
 *   2.  crm           — Leads, Campaigns, Conversions
 *   3.  admissions    — Applications, Counselling, Approvals
 *   4.  student       — Student Lifecycle, Profiles, Guardians
 *   5.  academics     — Curriculum, Observations, Report Cards
 *   6.  attendance    — Daily Attendance, Arrival, Pickup
 *   7.  communication — Announcements, Chat, Notifications
 *   8.  finance       — Fees, Invoices, Payments, Ledger, GST
 *   9.  inventory     — Items, Stock, PR, PO, GRN
 *  10.  hr            — Staff, Payroll, Leave, Attendance
 *  11.  administration— Assets, Maintenance, Visitors
 *  12.  reports       — Cross-domain Reports, Analytics
 *  13.  settings      — Academic Years, Calendars, Configs
 *  14.  platform      — Subscriptions, Billing, Feature Flags
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { appConfigSchema } from '../config/env/app-config.schema';
import { envValidator } from '../config/env/env.validator';
import { CacheModule } from '../infrastructure/cache/cache.module';
import { EventBusModule } from '../infrastructure/event-bus/event-bus.module';
import { HealthModule } from '../infrastructure/health/health.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { S3Module } from '../infrastructure/s3/s3.module';



// 14 bounded contexts (will be uncommented progressively as built)
import { IdentityModule } from '../modules/identity/identity.module';
import { StudentModule } from '../modules/student/student.module';
import { AcademicsModule } from '../modules/academics/academics.module';

import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { HttpLoggingInterceptor } from './interceptors/http-logging.interceptor';
import { TraceContextInterceptor } from './interceptors/trace-context.interceptor';

import type { AppConfig } from '../config/env/app-config.type';
// import { CrmModule } from './modules/crm/crm.module';
// import { AdmissionsModule } from './modules/admissions/admissions.module';
// import { AttendanceModule } from './modules/attendance/attendance.module';
// import { CommunicationModule } from './modules/communication/communication.module';
// import { FinanceModule } from './modules/finance/finance.module';
// import { InventoryModule } from './modules/inventory/inventory.module';
// import { HrModule } from './modules/hr/hr.module';
// import { AdministrationModule } from './modules/administration/administration.module';
// import { ReportsModule } from './modules/reports/reports.module';
// import { SettingsModule } from './modules/settings/settings.module';
// import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    // 1. Config — typed environment loading + validation
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: envValidator,
      load: [appConfigSchema],
      envFilePath: ['.env.local', `.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),

    // 2. Structured logging (Pino) — async transport to Loki in prod
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        pinoHttp: {
          level: config.get('app.logLevel', { infer: true }) ?? 'info',
          transport:
            config.get('app.env', { infer: true }) === 'production'
              ? { target: 'pino-loki', options: { host: config.get('app.lokiHost', { infer: true }) } }
              : { target: 'pino-pretty', options: { colorize: true } },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.aadhaar',
              'req.body.pan',
              '*.aadhaar',
              '*.pan',
              '*.password',
            ],
            censor: '[REDACTED]',
          },
          customProps: (req) => ({
            traceId: (req as any).traceId,
            requestId: (req as any).requestId,
          }),
        },
      }),
    }),

    // 3. Rate limiting — per-IP + per-user (BTD §20.1)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        {
          name: 'default',
          ttl: 60_000,
          limit: config.get('app.rateLimitPerMinute', { infer: true }) ?? 100,
        },
        {
          name: 'auth',
          ttl: 60_000,
          limit: 5, // auth routes: 5 req/min per IP
        },
      ],
    }),

    // 4. Scheduled jobs (cron-based)
    ScheduleModule.forRoot(),

    // 5. Infrastructure modules
    PrismaModule,
    RedisModule,
    EventBusModule,
    CacheModule,
    S3Module,
    HealthModule,

    // 6. Business modules (14 bounded contexts) — added progressively
    IdentityModule,
    StudentModule,
    AcademicsModule,
    // CrmModule,
    // AdmissionsModule,
    // AttendanceModule,
    // CommunicationModule,
    // FinanceModule,
    // InventoryModule,
    // HrModule,
    // AdministrationModule,
    // ReportsModule,
    // SettingsModule,
    // PlatformModule,
  ],
  providers: [
    // Global guards — JwtAuthGuard + PermissionsGuard run on every route
    // unless opted out via @Public() decorator
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global pipe — DTO validation
    // (ValidationPipe is registered in main.ts instead — global pipes need
    // an HTTP adapter to be already attached)

    // Global filter — standardized error response
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Global interceptors — logging + trace context propagation
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TraceContextInterceptor },
  ],
})
export class AppModule {}
