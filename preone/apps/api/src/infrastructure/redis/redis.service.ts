/**
 * RedisService — multi-DB Redis client wrapper.
 *
 * Each cache layer uses its own logical DB for isolation + monitoring.
 * BullMQ connects to DB 4 internally.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { type RedisOptions } from 'ioredis';
import type { AppConfig } from '@config/env/app-config.type';

export enum RedisDb {
  API_CACHE = 0,
  SESSION_STORE = 1,
  RATE_LIMITING = 2,
  OTP_CACHE = 3,
  BULLMQ = 4,
  DISTRIBUTED_LOCKS = 5,
  PUBSUB = 6,
  FEATURE_FLAGS = 7,
  IDEMPOTENCY = 8,
  GEO_INDEXING = 9,
}

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private readonly mainClient: IORedis;
  private readonly dbClients = new Map<RedisDb, IORedis>();
  private readonly options: RedisOptions;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const url = new URL(config.get('redis.url', { infer: true }));
    this.options = {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      keyPrefix: config.get('redis.keyPrefix', { infer: true }),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
        if (targetErrors.some((e) => err.message.includes(e))) return 2;
        return false;
      },
    };

    this.mainClient = new IORedis({ ...this.options, db: 0 });
  }

  async onModuleInit(): Promise<void> {
    // Health check happens in HealthModule
  }

  async connect(): Promise<void> {
    await this.mainClient.ping();
  }

  async disconnect(): Promise<void> {
    await Promise.all([this.mainClient.quit(), ...Array.from(this.dbClients.values()).map((c) => c.quit())]);
  }

  /** Default client (db 0 — API Cache). */
  get client(): IORedis {
    return this.mainClient;
  }

  /** Get a Redis client bound to a specific logical DB. */
  forDb(db: RedisDb): IORedis {
    if (!this.dbClients.has(db)) {
      const client = new IORedis({ ...this.options, db });
      this.dbClients.set(db, client);
    }
    return this.dbClients.get(db)!;
  }

  // ─────────────────────────────────────────────
  // Convenience wrappers (default DB = 0)
  // ─────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    return this.mainClient.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.mainClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.mainClient.set(key, value);
    }
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.mainClient.setex(key, ttlSeconds, value);
  }

  async del(key: string | string[]): Promise<number> {
    return Array.isArray(key) ? this.mainClient.del(...key) : this.mainClient.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.mainClient.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.mainClient.expire(key, ttlSeconds)) === 1;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.mainClient.exists(key)) === 1;
  }

  /** Acquire a distributed lock (Redlock-style, simplified). */
  async acquireLock(key: string, ttlMs: number, token: string): Promise<boolean> {
    const result = await this.forDb(RedisDb.DISTRIBUTED_LOCKS).set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /** Release a distributed lock (Lua CAS to ensure ownership). */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lua = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
    const result = await this.forDb(RedisDb.DISTRIBUTED_LOCKS).eval(lua, 1, key, token);
    return result === 1;
  }
}
