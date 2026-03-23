/**
 * Unit tests for OrderFormPage component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import OrderFormPage from '../OrderFormPage';

// Mock hooks
const mockUseOrder = vi.fn();
const mockUseCreateOrder = vi.fn();
const mockUseUpdateOrder = vi.fn();

vi.mock('@/hooks/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCreateOrder: () => mockUseCreateOrder(),
  useUpdateOrder: () => mockUseUpdateOrder(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock OrderForm to avoid deep rendering complexities
vi.mock('@/components/forms/OrderForm', () => ({
  OrderForm: ({ onSubmit, loading }: { onSubmit: (values: unknown) => Promise<void>; loading: boolean }) => (
    <div data-testid="order-form">
      <button
        data-testid="submit-btn"
        disabled={loading}
        onClick={() => onSubmit({
          customerId: 1,
          items: [{ fabricId: 1, quantity: 100, salePrice: 25 }],
        })}
      >
        Submit
      </button>
    </div>
  ),
}));

function renderCreatePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/orders/new']}>
        <Routes>
          <Route path="/orders/new" element={<OrderFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OrderFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseCreateOrder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    });

    mockUseUpdateOrder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
      isPending: false,
    });
  });

  describe('Create Mode', () => {
    it('should render create form', async () => {
      renderCreatePage();

      await waitFor(() => {
        expect(screen.getByTestId('order-form')).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 15000);

    it('should render page title for create mode', async () => {
      renderCreatePage();

      await waitFor(() => {
        expect(screen.getAllByText('新建订单').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Submit Error Handling', () => {
    it('should show Chinese error message on submit failure', async () => {
      const { message: antdMessage } = await import('antd');
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 400,
        message: 'Bad Request',
        data: null,
      });

      mockUseCreateOrder.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderCreatePage();

      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(antdMessage.error).toHaveBeenCalledWith('请求参数错误');
      });
    });

    it('should show server error message on 500', async () => {
      const { message: antdMessage } = await import('antd');
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      const mockMutateAsync = vi.fn().mockRejectedValue({
        code: 500,
        message: 'Internal Server Error',
        data: null,
      });

      mockUseCreateOrder.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderCreatePage();

      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(antdMessage.error).toHaveBeenCalledWith('服务器错误，请稍后重试');
      });
    });
  });
});
