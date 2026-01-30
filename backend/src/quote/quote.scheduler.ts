import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuoteService } from './quote.service';

// Maximum consecutive failures before critical alert
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Scheduler for quote-related background tasks.
 * Runs periodic jobs to maintain quote status consistency.
 */
@Injectable()
export class QuoteScheduler {
  private readonly logger = new Logger(QuoteScheduler.name);
  private consecutiveFailures = 0;

  constructor(private readonly quoteService: QuoteService) {}

  /**
   * Mark expired quotes every hour.
   * Scans all active quotes and marks those past validUntil as expired.
   * Tracks consecutive failures and logs critical alerts when threshold exceeded.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredQuotes(): Promise<void> {
    this.logger.debug('Running expired quotes check...');

    try {
      const count = await this.quoteService.markExpiredQuotes();

      // Reset failure counter on success
      this.consecutiveFailures = 0;

      if (count > 0) {
        this.logger.log(`Marked ${count} quotes as expired`);
      } else {
        this.logger.debug('No expired quotes found');
      }
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.error(
        `Failed to mark expired quotes (failure ${this.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${(error as Error).message}`,
      );

      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        this.logger.error(
          'CRITICAL: Quote expiration scheduler has failed multiple times consecutively. Manual intervention may be required.',
        );
      }
    }
  }

  /**
   * Get current consecutive failure count.
   * Useful for monitoring and testing.
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Reset consecutive failure count.
   * Useful for testing.
   */
  resetConsecutiveFailures(): void {
    this.consecutiveFailures = 0;
  }
}
