import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class CommonModule {}

// Re-export utilities for convenient imports
export {
  PaginationDto,
  buildPaginationArgs,
  buildPaginatedResult,
} from './utils/pagination';
export type { PaginatedResult } from './utils/pagination';
