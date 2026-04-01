import { Controller, Get, Res } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';

/**
 * Custom Prometheus metrics controller that bypasses the global
 * TransformInterceptor by using @Res({ passthrough: true }).
 * This ensures /metrics returns raw Prometheus text format
 * instead of being wrapped in { code, message, data } JSON.
 */
@Controller('metrics')
export class MetricsController extends PrometheusController {
  @Get()
  async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
