import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuoteService } from './quote.service';

/**
 * Scheduler for quote-related background tasks.
 * Runs periodic jobs to maintain quote status consistency.
 */
@Injectable()
export class QuoteScheduler {
  private readonly logger = new Logger(QuoteScheduler.name);

  constructor(private readonly quoteService: QuoteService) {}

  /**
   * Mark expired quotes every hour.
   * Scans all active quotes and marks those past validUntil as expired.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredQuotes(): Promise<void> {
    this.logger.debug('Running expired quotes check...');

    try {
      const count = await this.quoteService.markExpiredQuotes();

      if (count > 0) {
        this.logger.log(`Marked ${count} quotes as expired`);
      } else {
        this.logger.debug('No expired quotes found');
      }
    } catch (error) {
      this.logger.error(
        `Failed to mark expired quotes: ${(error as Error).message}`,
      );
    }
  }
}
