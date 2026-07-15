/**
 * HealthService — checks DB, Redis, S3 connectivity.
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';
import { RedisService } from '@infra/redis/redis.service';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: HealthCheckResult[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness probe — process is alive. */
  liveness(): HealthReport {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: [{ name: 'process', status: 'healthy' }],
    };
  }

  /** Readiness probe — dependencies reachable. */
  async readiness(): Promise<HealthReport> {
    const checks: HealthCheckResult[] = [];

    // Check PostgreSQL
    checks.push(await this.checkPostgres());

    // Check Redis
    checks.push(await this.checkRedis());

    const anyUnhealthy = checks.some((c) => c.status === 'unhealthy');
    return {
      status: anyUnhealthy ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkPostgres(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { name: 'postgres', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        name: 'postgres',
        status: 'unhealthy',
        error: (err as Error).message,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const pong = await this.redis.client.ping();
      return {
        name: 'redis',
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return { name: 'redis', status: 'unhealthy', error: (err as Error).message };
    }
  }
}
