/**
 * RedisModule — Redis client wiring for cache + BullMQ + pub/sub + locks.
 *
 * Per ADR-111 §8.4 Logical Database Allocation:
 *   db 0 — API Cache
 *   db 1 — Session Store
 *   db 2 — Rate Limiting
 *   db 3 — OTP Cache
 *   db 4 — BullMQ Queues
 *   db 5 — Distributed Locks
 *   db 6 — Pub/Sub
 *   db 7 — Feature Flags
 *   db 8 — Idempotency Store
 *   db 9 — Geo Indexing (Transport)
 *
 * For dev: single Redis instance, multiple logical DBs.
 * For prod: 6 nodes (3 master + 3 replica) with Sentinel HA.
 */
import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);
  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
    this.logger.log('✅ Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.disconnect();
    this.logger.log('🔌 Redis disconnected');
  }
}
