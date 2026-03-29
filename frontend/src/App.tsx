/**
 * Root application component.
 *
 * Sets up providers for:
 * - TanStack Query for server state management
 * - Ant Design ConfigProvider for UI theming
 * - React Router for navigation
 */

import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';

import { AppRouter } from '@/routes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

/**
 * TanStack Query client configuration.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN}>
          <AntdApp>
            <AppRouter />
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
