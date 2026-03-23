import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis service wrapper providing connection management and fallback support.
 * Gracefully handles Redis unavailability scenarios.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured. Redis features will be unavailable.',
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected');
      });

      this.client.on('error', (error: Error) => {
        this.isConnected = false;
        this.logger.error(`Redis error: ${error.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      // Attempt connection
      this.client.connect().catch((error: Error) => {
        this.logger.error(`Redis connection failed: ${error.message}`);
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize Redis client: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Check if Redis is currently available.
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get the Redis client instance.
   * Returns null if Redis is not available.
   */
  getClient(): Redis | null {
    return this.isAvailable() ? this.client : null;
  }

  /**
   * Increment a key atomically and return the new value.
   * Returns null if Redis is unavailable.
   */
  async incr(key: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client!.incr(key);
    } catch (error) {
      this.logger.error(
        `Redis INCR failed for key ${key}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Get the value of a key.
   * Returns null if Redis is unavailable or key doesn't exist.
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      this.logger.error(
        `Redis GET failed for key ${key}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Set the value of a key.
   * Returns false if Redis is unavailable.
   */
  async set(key: string, value: string | number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.set(key, value);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis SET failed for key ${key}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Set the value of a key with expiration (in seconds).
   * Returns false if Redis is unavailable.
   */
  async setex(
    key: string,
    seconds: number,
    value: string | number,
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.setex(key, seconds, value);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis SETEX failed for key ${key}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Delete a key from Redis.
   * Returns false if Redis is unavailable.
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis DEL failed for key ${key}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Acquire a distributed lock using Redis SET NX EX.
   * Returns true if lock was acquired, false otherwise.
   * Uses call() instead of set() to avoid ioredis TypeScript overload issue.
   */
  async acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.call(
        'set',
        `lock:${key}`,
        '1',
        'NX',
        'EX',
        String(ttlSeconds),
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error(
        `Redis LOCK failed for key ${key}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Release a distributed lock.
   * Delegates to del() with the lock key prefix.
   */
  async releaseLock(key: string): Promise<boolean> {
    return this.del(`lock:${key}`);
  }

  /**
   * Ping Redis to check connection health.
   * Returns 'PONG' if successful, throws if unavailable.
   */
  async ping(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    return await this.client!.ping();
  }
}
