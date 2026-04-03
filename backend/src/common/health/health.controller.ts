import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../services/redis.service';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([
      () => Promise.resolve<HealthIndicatorResult>({ app: { status: 'up' } }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' } };
      },
      async (): Promise<HealthIndicatorResult> => {
        await this.redis.ping();
        return { redis: { status: 'up' } };
      },
    ]);
  }
}
