/* eslint-disable react-refresh/only-export-components */
/**
 * Test utilities for React Testing Library.
 * This file is not a component file - it's a test utility module.
 */

import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { vi } from 'vitest';

/**
 * Providers wrapper for tests.
 */
function TestProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <ConfigProvider locale={zhCN}>
      {children}
    </ConfigProvider>
  );
}

/**
 * Custom render with providers.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  });
}

/**
 * Wait for async state updates.
 */
export async function waitForAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Flush all pending timers (for debounce/throttle tests).
 */
export function flushTimers(): void {
  vi.runAllTimers();
}

/**
 * Advance timers by specified milliseconds.
 */
export function advanceTimersBy(ms: number): void {
  vi.advanceTimersByTime(ms);
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
