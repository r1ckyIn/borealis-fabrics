/**
 * Unit tests for structured logger utility.
 * Verifies Sentry integration in production and console fallback in development.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';

// Mock @sentry/react
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Helper to set import.meta.env values for each test
function setEnv(mode: string, sentryDsn: string) {
  vi.stubEnv('MODE', mode);
  vi.stubEnv('VITE_SENTRY_DSN', sentryDsn);
}

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should call Sentry.captureException in production with DSN set', async () => {
    setEnv('production', 'https://fake@sentry.io/123');

    const { logger } = await import('../logger');
    const testError = new Error('test error');
    logger.error('Something failed', testError);

    expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
      extra: { message: 'Something failed' },
    });
  });

  it('should call console.error in development mode', async () => {
    setEnv('development', '');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('../logger');
    const testError = new Error('dev error');
    logger.error('Dev failure', testError);

    expect(consoleSpy).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should wrap string-only errors in new Error for Sentry', async () => {
    setEnv('production', 'https://fake@sentry.io/123');

    const { logger } = await import('../logger');
    logger.error('String error happened', 'not-an-error-object');

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({ message: 'String error happened' }),
      })
    );
    const capturedError = (Sentry.captureException as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as Error;
    expect(capturedError.message).toBe('String error happened');
  });

  it('should call Sentry.captureMessage with warning level in production', async () => {
    setEnv('production', 'https://fake@sentry.io/123');

    const { logger } = await import('../logger');
    logger.warn('Something suspicious', { userId: 42 });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Something suspicious', {
      level: 'warning',
      extra: { userId: 42 },
    });
  });

  it('should call console.warn in development for warn()', async () => {
    setEnv('development', '');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('../logger');
    logger.warn('Dev warning');

    expect(consoleSpy).toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should only log in development for info()', async () => {
    setEnv('development', '');

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('../logger');
    logger.info('Dev info message');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log info in production', async () => {
    setEnv('production', 'https://fake@sentry.io/123');

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('../logger');
    logger.info('Should be silent');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should pass context as Sentry extra', async () => {
    setEnv('production', 'https://fake@sentry.io/123');

    const { logger } = await import('../logger');
    const err = new Error('context test');
    logger.error('With context', err, { orderId: 123, status: 'FAILED' });

    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { message: 'With context', orderId: 123, status: 'FAILED' },
    });
  });
});
