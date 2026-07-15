/**
 * CacheModule — Redis cache layer wiring.
 *
 * Per BTD §16.1: 10 distinct cache layers
 * Per BTD §16.3: explicit invalidation preferred over TTL;
 *   versioned cache keys for atomic invalidation
 */
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
