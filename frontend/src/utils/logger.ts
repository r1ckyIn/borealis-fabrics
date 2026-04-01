/**
 * Structured logging utility.
 *
 * Routes errors to Sentry in production (when DSN is configured),
 * falls back to console methods in development.
 */

import * as Sentry from '@sentry/react';

type LogContext = Record<string, unknown>;

const isProduction = import.meta.env.MODE === 'production';
const hasSentry = !!import.meta.env.VITE_SENTRY_DSN;

export const logger = {
  /**
   * Log an error. In production with Sentry, captures as exception.
   * In development, logs to console.error.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (isProduction && hasSentry) {
      Sentry.captureException(
        error instanceof Error ? error : new Error(message),
        {
          extra: { message, ...context },
        }
      );
    } else {
      console.error(`[ERROR] ${message}`, error, context);
    }
  },

  /**
   * Log a warning. In production with Sentry, captures as message with warning level.
   * In development, logs to console.warn.
   */
  warn(message: string, context?: LogContext): void {
    if (isProduction && hasSentry) {
      Sentry.captureMessage(message, { level: 'warning', extra: context });
    } else {
      console.warn(`[WARN] ${message}`, context);
    }
  },

  /**
   * Log informational message. Only outputs in non-production environments.
   */
  info(message: string, context?: LogContext): void {
    if (!isProduction) {
      console.info(`[INFO] ${message}`, context);
    }
  },
};
