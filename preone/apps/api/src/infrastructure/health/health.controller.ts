/**
 * HealthController — /health endpoints.
 *
 * Routes are EXCLUDED from the /v1 prefix and JwtAuthGuard (@Public()).
 */
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { Public } from '@app/decorators/auth.decorators';

import { HealthService, type HealthReport } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness probe — K8s restarts pod if this fails. */
  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): HealthReport {
    return this.health.liveness();
  }

  /** Readiness probe — K8s removes pod from service if this fails. */
  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthReport> {
    return this.health.readiness();
  }

  /** Full health report — for ops dashboards. */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async full(): Promise<HealthReport> {
    return this.health.readiness();
  }
}
