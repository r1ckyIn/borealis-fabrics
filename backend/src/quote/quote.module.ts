import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { QuoteScheduler } from './quote.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [QuoteController],
  providers: [QuoteService, QuoteScheduler],
  exports: [QuoteService],
})
export class QuoteModule {}
