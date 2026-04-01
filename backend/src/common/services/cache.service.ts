import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

const CACHE_PREFIX = 'cache:';

/**
 * Cache-aside service wrapping RedisService.
 * Provides getOrSet for cache-aside pattern and
 * invalidateByPrefix for batch cache invalidation via SCAN.
 *
 * All cache keys are namespaced with 'cache:' prefix to avoid
 * collisions with seq:, lock: and other Redis key patterns.
 *
 * Gracefully degrades to direct factory calls when Redis is unavailable.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Get a value from cache, or compute and store it if missing.
   * Falls through to factory on cache miss, parse error, or Redis unavailability.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = CACHE_PREFIX + key;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          this.logger.warn(
            `Cache parse error for key ${cacheKey}, falling through to factory`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Cache read error for key ${cacheKey}: ${(error as Error).message}`,
      );
    }

    const value = await factory();

    try {
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(
        `Cache write error for key ${cacheKey}: ${(error as Error).message}`,
      );
    }

    return value;
  }

  /**
   * Invalidate all cache keys matching a prefix using cursor-based SCAN.
   * Uses SCAN instead of KEYS to avoid blocking Redis on large keyspaces.
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) {
      return;
    }

    const pattern = CACHE_PREFIX + prefix + '*';
    let cursor = '0';

    try {
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for prefix ${prefix}: ${(error as Error).message}`,
      );
    }
  }
}
