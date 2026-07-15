/**
 * PreOne API — Bootstrap entry point
 * ----------------------------------
 * Responsibilities (per Backend TD §3.2 — Request Lifecycle):
 *   1. Bootstrap OpenTelemetry FIRST (before any other import).
 *   2. Create NestJS app with Express adapter.
 *   3. Enable global pipes, filters, interceptors, middleware.
 *   4. Enable CORS, Helmet, compression, cookie-parser.
 *   5. Configure Swagger / OpenAPI documentation.
 *   6. Start listening on configured port.
 *
 * Design Principles (ADR-111 §2.4):
 *   - 12-Factor App: stateless services, externalized config, disposability
 *   - Observability-First: metrics + logs + traces from day one
 *   - Defense-in-Depth: Helmet + CORS + rate-limit + RBAC + RLS
 */

// 1. OpenTelemetry must be started BEFORE any other import
//    so that auto-instrumentation can hook into all modules.
import { startOpenTelemetry } from './infrastructure/otel/otel.startup';

await startOpenTelemetry();

// 2. Standard NestJS imports
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

// 3. App-level imports
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './app/filters/all-exceptions.filter';
import { HttpLoggingInterceptor } from './app/interceptors/http-logging.interceptor';
import { TimeoutInterceptor } from './app/interceptors/timeout.interceptor';
import { TraceIdMiddleware } from './app/middleware/trace-id.middleware';
import { envValidator } from './config/env/env.validator';

import type { AppConfig } from './config/env/app-config.type';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Use Pino as the primary logger (structured JSON in prod, pretty in dev)
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('app.port', { infer: true }) ?? 3001;
  const env = configService.get('app.env', { infer: true }) ?? 'development';
  const corsOrigin = configService.get('app.corsOrigin', { infer: true }) ?? '*';

  // 1. Trust proxy (behind NGINX/CloudFront)
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && typeof (httpAdapter as any).getInstance === 'function') {
    const instance = (httpAdapter as any).getInstance();
    if (instance && typeof instance.set === 'function') {
      instance.set('trust proxy', 1);
    }
  }

  // 2. Security: Helmet, CORS, Cookie-parser
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Idempotency-Key'],
      exposedHeaders: ['X-Request-Id', 'X-Trace-Id'],
      maxAge: 86400,
    }),
  );
  app.use(cookieParser());
  app.use(compression({ threshold: 256 }));

  // 3. Trace ID middleware — generates X-Trace-Id per request
  app.use(TraceIdMiddleware);

  // 4. Global prefix /v1 (versioned API)
  app.setGlobalPrefix('v1', {
    exclude: ['/health', '/health/live', '/health/ready', '/metrics'],
  });

  // 5. Global ValidationPipe — DTO validation (Zod + class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // 6. Global exception filter — standardized error response shape
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  // 7. Global interceptors — request logging + timeout
  app.useGlobalInterceptors(
    app.get(HttpLoggingInterceptor),
    new TimeoutInterceptor(30_000),
  );

  // 8. Swagger / OpenAPI docs (dev + staging only)
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PreOne Enterprise API')
      .setDescription('Enterprise Preschool Operating System — REST API v1')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addTag('identity', 'Users, Roles, Permissions, Tenants')
      .addTag('crm', 'Leads, Campaigns, Conversions')
      .addTag('admissions', 'Applications, Counselling, Approvals')
      .addTag('student', 'Student Lifecycle, Profiles, Guardians')
      .addTag('academics', 'Curriculum, Observations, Report Cards')
      .addTag('attendance', 'Daily Attendance, Arrival, Pickup')
      .addTag('communication', 'Announcements, Chat, Notifications')
      .addTag('finance', 'Fees, Invoices, Payments, Ledger, GST')
      .addTag('inventory', 'Items, Stock, PR, PO, GRN')
      .addTag('hr', 'Staff, Payroll, Leave, Attendance')
      .addTag('administration', 'Assets, Maintenance, Visitors')
      .addTag('reports', 'Cross-domain Reports, Analytics')
      .addTag('settings', 'Academic Years, Calendars, Configs')
      .addTag('platform', 'Subscriptions, Billing, Feature Flags')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'PreOne API Docs',
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // 9. Graceful shutdown hooks (K8s SIGTERM)
  app.enableShutdownHooks([`SIGINT`, `SIGTERM`]);

  // 10. Start server
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 PreOne API running on http://0.0.0.0:${port}/v1`);
  logger.log(`📚 Swagger docs at http://0.0.0.0:${port}/docs`);
  logger.log(`🌍 Environment: ${env}`);
  logger.log(`🏥 Health check at http://0.0.0.0:${port}/health`);
}

bootstrap().catch((err) => {
   
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
