/**
 * Tests for ErrorBoundary component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { logger } from '@/utils/logger';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Normal content</div>;
}

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.mocked(logger.error).mockClear();
});

afterEach(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  describe('Normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child content</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });

  describe('Error catching', () => {
    it('catches errors and shows default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('出错了')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('shows generic message when error message is null/undefined', () => {
      // Note: new Error() creates error with empty string message, not undefined
      // The component uses ?? which only triggers for null/undefined
      // This test verifies the fallback works when error.message is truly nullish
      const ThrowErrorWithNullMessage = () => {
        const error = new Error('will be overwritten');
        // @ts-expect-error - intentionally setting message to undefined
        error.message = undefined;
        throw error;
      };

      render(
        <ErrorBoundary>
          <ThrowErrorWithNullMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText('出错了')).toBeInTheDocument();
      expect(screen.getByText('页面发生了一些错误，请稍后重试')).toBeInTheDocument();
    });

    it('shows empty subtitle when error has empty string message', () => {
      // new Error() creates error with empty string message
      const ThrowEmptyError = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      // Title should be shown
      expect(screen.getByText('出错了')).toBeInTheDocument();
      // Empty message means empty subtitle (not the fallback text)
      expect(screen.queryByText('页面发生了一些错误，请稍后重试')).not.toBeInTheDocument();
    });

    it('calls logger.error when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.objectContaining({ message: 'Test error message' }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('shows retry button in default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      // Ant Design Result button text may have spaces
      expect(screen.getByRole('button', { name: /重.*试/ })).toBeInTheDocument();
    });
  });

  describe('Custom fallback', () => {
    it('renders custom fallback when error occurs', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('does not show default fallback when custom fallback is provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom</div>}>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.queryByText('出错了')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('onError callback', () => {
    it('calls onError when error is caught', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('does not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Retry functionality', () => {
    it('resets error state when retry button is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="recovered">Recovered!</div>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show error
      expect(screen.getByText('出错了')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry button
      fireEvent.click(screen.getByRole('button'));

      // Should now show recovered content
      expect(screen.getByTestId('recovered')).toBeInTheDocument();
      expect(screen.queryByText('出错了')).not.toBeInTheDocument();
    });

    it('shows error again if retry fails', () => {
      const TestComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('出错了')).toBeInTheDocument();
      expect(screen.getByText('Persistent error')).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByRole('button'));

      // Error should persist after retry
      expect(screen.getByText('出错了')).toBeInTheDocument();
    });
  });

  describe('Error isolation', () => {
    it('does not affect sibling components', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow />
          </ErrorBoundary>
          <div data-testid="sibling">Sibling content</div>
        </div>
      );

      expect(screen.getByText('出错了')).toBeInTheDocument();
      expect(screen.getByTestId('sibling')).toBeInTheDocument();
      expect(screen.getByText('Sibling content')).toBeInTheDocument();
    });
  });
});
