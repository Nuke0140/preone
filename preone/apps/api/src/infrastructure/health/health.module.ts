/**
 * HealthModule — health check endpoints for K8s probes.
 *
 * Per BTD §23.2: Health endpoints used by K8s liveness/readiness probes.
 *   - /health/live  — process is running (always 200 if responding)
 *   - /health/ready — dependencies are reachable (DB, Redis)
 *   - /health       — full status report (for ops dashboard)
 */
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
