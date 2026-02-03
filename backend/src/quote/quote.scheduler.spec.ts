import { Test, TestingModule } from '@nestjs/testing';
import { QuoteScheduler } from './quote.scheduler';
import { QuoteService } from './quote.service';

describe('QuoteScheduler', () => {
  let scheduler: QuoteScheduler;
  let mockQuoteService: { markExpiredQuotes: jest.Mock };

  beforeEach(async () => {
    mockQuoteService = {
      markExpiredQuotes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteScheduler,
        { provide: QuoteService, useValue: mockQuoteService },
      ],
    }).compile();

    scheduler = module.get<QuoteScheduler>(QuoteScheduler);
  });

  afterEach(() => {
    scheduler.resetConsecutiveFailures();
  });

  describe('handleExpiredQuotes', () => {
    it('should mark expired quotes successfully', async () => {
      mockQuoteService.markExpiredQuotes.mockResolvedValue(5);

      await scheduler.handleExpiredQuotes();

      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalled();
      expect(scheduler.getConsecutiveFailures()).toBe(0);
    });

    it('should handle when no expired quotes found', async () => {
      mockQuoteService.markExpiredQuotes.mockResolvedValue(0);

      await scheduler.handleExpiredQuotes();

      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalled();
      expect(scheduler.getConsecutiveFailures()).toBe(0);
    });

    it('should increment consecutive failures on error', async () => {
      mockQuoteService.markExpiredQuotes.mockRejectedValue(
        new Error('Database error'),
      );

      await scheduler.handleExpiredQuotes();

      expect(scheduler.getConsecutiveFailures()).toBe(1);
    });

    it('should reset consecutive failures on success after failure', async () => {
      mockQuoteService.markExpiredQuotes
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(3);

      // First call fails
      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(1);

      // Second call succeeds
      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(0);
    });

    it('should track multiple consecutive failures', async () => {
      mockQuoteService.markExpiredQuotes.mockRejectedValue(
        new Error('Database error'),
      );

      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(1);

      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(2);

      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(3);
    });

    it('should not throw when service throws error', async () => {
      mockQuoteService.markExpiredQuotes.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(scheduler.handleExpiredQuotes()).resolves.not.toThrow();
    });
  });

  describe('getConsecutiveFailures', () => {
    it('should return current failure count', () => {
      expect(scheduler.getConsecutiveFailures()).toBe(0);
    });
  });

  describe('resetConsecutiveFailures', () => {
    it('should reset failure count to zero', async () => {
      mockQuoteService.markExpiredQuotes.mockRejectedValue(
        new Error('Database error'),
      );

      await scheduler.handleExpiredQuotes();
      expect(scheduler.getConsecutiveFailures()).toBe(1);

      scheduler.resetConsecutiveFailures();
      expect(scheduler.getConsecutiveFailures()).toBe(0);
    });
  });

  describe('duplicate execution prevention', () => {
    it('should prevent concurrent execution', async () => {
      // Simulate slow execution
      let resolveFirst: () => void;
      const slowPromise = new Promise<number>((resolve) => {
        resolveFirst = () => resolve(5);
      });
      mockQuoteService.markExpiredQuotes.mockReturnValueOnce(slowPromise);
      mockQuoteService.markExpiredQuotes.mockResolvedValueOnce(3);

      // Start first execution (will be slow)
      const firstExecution = scheduler.handleExpiredQuotes();

      // Try second execution while first is running
      const secondExecution = scheduler.handleExpiredQuotes();

      // Second execution should skip (return immediately without calling service)
      await secondExecution;

      // Complete first execution
      resolveFirst!();
      await firstExecution;

      // Service should only be called once (second call was skipped)
      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalledTimes(1);
    });

    it('should allow execution after previous completes', async () => {
      mockQuoteService.markExpiredQuotes.mockResolvedValue(5);

      // First execution
      await scheduler.handleExpiredQuotes();
      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalledTimes(1);

      // Second execution after first completes
      await scheduler.handleExpiredQuotes();
      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalledTimes(2);
    });

    it('should release lock even when execution fails', async () => {
      mockQuoteService.markExpiredQuotes
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(5);

      // First execution fails
      await scheduler.handleExpiredQuotes();
      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalledTimes(1);

      // Second execution should work (lock released after failure)
      await scheduler.handleExpiredQuotes();
      expect(mockQuoteService.markExpiredQuotes).toHaveBeenCalledTimes(2);
    });

    it('should return running status correctly', () => {
      expect(scheduler.isCurrentlyRunning()).toBe(false);
    });
  });
});
