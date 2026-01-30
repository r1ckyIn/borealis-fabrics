import { Module, Global } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { CodeGeneratorService } from './services/code-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RedisService, CodeGeneratorService],
  exports: [RedisService, CodeGeneratorService],
})
export class CommonModule {}

// Re-export utilities for convenient imports
export {
  PaginationDto,
  buildPaginationArgs,
  buildPaginatedResult,
} from './utils/pagination';
export type { PaginatedResult } from './utils/pagination';
