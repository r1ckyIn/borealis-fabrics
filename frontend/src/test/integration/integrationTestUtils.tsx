/* eslint-disable react-refresh/only-export-components */
/**
 * Integration test utilities.
 * Provides QueryClient + MemoryRouter + ConfigProvider wrapper
 * that keeps hooks and stores running with real code while
 * mocking only the API layer.
 */

import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import type { PaginatedResult } from '@/types/api.types';
import { useAuthStore } from '@/store/authStore';
import { createMockAuthUser } from '@/test/mocks/mockFactories';

/**
 * Create an isolated QueryClient for a single test.
 * Retries disabled; cache cleared immediately after GC.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface IntegrationRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route entries for MemoryRouter. */
  initialEntries?: string[];
  /** Pre-set authStore to authenticated state. */
  withAuth?: boolean;
  /** Provide an external QueryClient (created per-test). */
  queryClient?: QueryClient;
}

/**
 * Render a component with full integration providers.
 */
export function renderIntegration(
  ui: ReactElement,
  options: IntegrationRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const {
    initialEntries = ['/'],
    withAuth = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  if (withAuth) {
    setupAuthenticatedState();
  }

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  return { ...result, queryClient };
}

/**
 * Pre-populate authStore with an authenticated user.
 */
export function setupAuthenticatedState(): void {
  useAuthStore.setState({
    user: createMockAuthUser({ id: 1 }),
    isInitializing: false,
  });
}

/**
 * Reset authStore to unauthenticated state.
 */
export function clearAuthState(): void {
  useAuthStore.setState({
    user: null,
    isInitializing: false,
  });
}

/**
 * Empty paginated API response for mocking list endpoints.
 */
export const EMPTY_PAGINATED: PaginatedResult<never> = {
  items: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

// Re-export for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
