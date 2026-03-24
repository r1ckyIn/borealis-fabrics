/**
 * Integration tests for payment voucher flow.
 * Tests VoucherUploader + VoucherList integration in OrderPaymentSection.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PaymentRecord, Order, SupplierPayment } from '@/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsyncCustomer = vi.fn();
const mockMutateAsyncSupplier = vi.fn();
const mockPaymentVouchersData: PaymentRecord[] = [];

vi.mock('@/hooks/queries/useOrders', () => ({
  useUpdateCustomerPayment: () => ({
    mutateAsync: mockMutateAsyncCustomer,
    isPending: false,
  }),
  useUpdateSupplierPayment: () => ({
    mutateAsync: mockMutateAsyncSupplier,
    isPending: false,
  }),
  usePaymentVouchers: () => ({
    data: mockPaymentVouchersData,
    isLoading: false,
  }),
}));

const mockUploadFile = vi.fn();
vi.mock('@/api/file.api', () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
}));

vi.mock('@/utils/errorMessages', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = createQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockOrder: Order = {
  id: 1,
  orderCode: 'BF-2603-0001',
  customerId: 1,
  status: 'pending' as Order['status'],
  totalAmount: 10000,
  customerPaid: 0,
  customerPayStatus: 'unpaid',
  customerPayMethod: null,
  customerPaidAt: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockSupplierPayments: SupplierPayment[] = [
  {
    id: 1,
    orderId: 1,
    supplierId: 10,
    payable: 5000,
    paid: 0,
    payStatus: 'unpaid',
    payMethod: null,
    paidAt: null,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    supplier: {
      id: 10,
      companyName: 'Test Supplier A',
      status: 'active' as SupplierPayment['supplier'] extends { status: infer S } ? S : never,
      settleType: 'cash' as SupplierPayment['supplier'] extends { settleType: infer S } ? S : never,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 2,
    orderId: 1,
    supplierId: 20,
    payable: 3000,
    paid: 0,
    payStatus: 'unpaid',
    payMethod: null,
    paidAt: null,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    supplier: {
      id: 20,
      companyName: 'Test Supplier B',
      status: 'active' as SupplierPayment['supplier'] extends { status: infer S } ? S : never,
      settleType: 'cash' as SupplierPayment['supplier'] extends { settleType: infer S } ? S : never,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  },
];

const mockCustomerPaymentRecords: PaymentRecord[] = [
  {
    id: 100,
    orderId: 1,
    type: 'customer',
    amount: 5000,
    payMethod: 'wechat',
    createdAt: '2026-03-10T10:00:00Z',
    vouchers: [
      {
        id: 200,
        paymentRecordId: 100,
        fileId: 300,
        remark: null,
        createdAt: '2026-03-10T10:00:00Z',
        file: {
          id: 300,
          key: 'receipt-1.jpg',
          url: 'https://example.com/receipt-1.jpg',
          originalName: 'receipt-1.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          createdAt: '2026-03-10T10:00:00Z',
        },
      },
    ],
  },
];

const mockSupplierPaymentRecords: PaymentRecord[] = [
  {
    id: 101,
    orderId: 1,
    type: 'supplier',
    supplierId: 10,
    amount: 2000,
    payMethod: 'alipay',
    createdAt: '2026-03-11T10:00:00Z',
    vouchers: [
      {
        id: 201,
        paymentRecordId: 101,
        fileId: 301,
        remark: null,
        createdAt: '2026-03-11T10:00:00Z',
        file: {
          id: 301,
          key: 'invoice-1.pdf',
          url: 'https://example.com/invoice-1.pdf',
          originalName: 'invoice-1.pdf',
          mimeType: 'application/pdf',
          size: 4096,
          createdAt: '2026-03-11T10:00:00Z',
        },
      },
    ],
  },
  {
    id: 102,
    orderId: 1,
    type: 'supplier',
    supplierId: 20,
    amount: 1500,
    payMethod: null,
    createdAt: '2026-03-12T10:00:00Z',
    vouchers: [
      {
        id: 202,
        paymentRecordId: 102,
        fileId: 302,
        remark: null,
        createdAt: '2026-03-12T10:00:00Z',
        file: {
          id: 302,
          key: 'receipt-b.png',
          url: 'https://example.com/receipt-b.png',
          originalName: 'receipt-b.png',
          mimeType: 'image/png',
          size: 3072,
          createdAt: '2026-03-12T10:00:00Z',
        },
      },
    ],
  },
];

// Lazy imports to ensure mocks are applied first
async function loadComponents() {
  const mod = await import('../OrderPaymentSection');
  return {
    CustomerPaymentTab: mod.CustomerPaymentTab,
    SupplierPaymentsTab: mod.SupplierPaymentsTab,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Payment Voucher Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadFile.mockResolvedValue({
      id: 1,
      key: 'test-key',
      url: 'https://example.com/file.jpg',
      originalName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      createdAt: '2026-03-24T00:00:00Z',
    });
    mockMutateAsyncCustomer.mockResolvedValue({});
    mockMutateAsyncSupplier.mockResolvedValue({});
    // Reset the shared array
    mockPaymentVouchersData.length = 0;
  });

  describe('CustomerPaymentTab', () => {
    it('disables OK button in modal when no vouchers are attached', async () => {
      const { CustomerPaymentTab } = await loadComponents();
      const user = userEvent.setup();

      render(
        <Wrapper>
          <CustomerPaymentTab orderId={1} order={mockOrder} />
        </Wrapper>
      );

      // Click the edit button on the PaymentStatusCard
      const editButton = screen.getByText('编辑');
      await user.click(editButton);

      // The modal should be open. Find the OK button and verify it is disabled.
      await waitFor(() => {
        const okButton = document.querySelector(
          '.ant-modal-footer .ant-btn-primary'
        ) as HTMLButtonElement;
        expect(okButton).toBeTruthy();
        expect(okButton.disabled).toBe(true);
      });
    });

    it('enables OK button after file upload', async () => {
      const { CustomerPaymentTab } = await loadComponents();
      const user = userEvent.setup();

      render(
        <Wrapper>
          <CustomerPaymentTab orderId={1} order={mockOrder} />
        </Wrapper>
      );

      // Open modal
      await user.click(screen.getByText('编辑'));

      // Wait for modal to open
      await waitFor(() => {
        expect(
          document.querySelector('.ant-modal-footer .ant-btn-primary')
        ).toBeTruthy();
      });

      // Find the file input and simulate uploading a file
      const fileInput = document.querySelector(
        '.ant-upload input[type="file"]'
      ) as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const file = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      // After upload resolves, the OK button should be enabled
      await waitFor(() => {
        const okButton = document.querySelector(
          '.ant-modal-footer .ant-btn-primary'
        ) as HTMLButtonElement;
        expect(okButton).toBeTruthy();
        expect(okButton.disabled).toBe(false);
      });
    });

    it('includes voucherFileIds in mutation call when submitting', async () => {
      const { CustomerPaymentTab } = await loadComponents();
      const user = userEvent.setup();

      render(
        <Wrapper>
          <CustomerPaymentTab orderId={1} order={mockOrder} />
        </Wrapper>
      );

      // Open modal
      await user.click(screen.getByText('编辑'));

      // Wait for modal
      await waitFor(() => {
        expect(
          document.querySelector('.ant-modal-footer .ant-btn-primary')
        ).toBeTruthy();
      });

      // Upload a file
      const fileInput = document.querySelector(
        '.ant-upload input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      // Wait for OK button to enable
      await waitFor(() => {
        const okButton = document.querySelector(
          '.ant-modal-footer .ant-btn-primary'
        ) as HTMLButtonElement;
        expect(okButton.disabled).toBe(false);
      });

      // Click OK button to submit
      const okButton = document.querySelector(
        '.ant-modal-footer .ant-btn-primary'
      ) as HTMLButtonElement;
      await user.click(okButton);

      // Verify mutation was called with voucherFileIds
      await waitFor(() => {
        expect(mockMutateAsyncCustomer).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: 1,
            data: expect.objectContaining({
              voucherFileIds: [1],
            }),
          })
        );
      });
    });

    it('displays VoucherList with existing customer payment vouchers', async () => {
      // Set payment records data to include customer records
      mockPaymentVouchersData.push(...mockCustomerPaymentRecords);
      const { CustomerPaymentTab } = await loadComponents();

      render(
        <Wrapper>
          <CustomerPaymentTab orderId={1} order={mockOrder} />
        </Wrapper>
      );

      // Verify VoucherList is rendered with file names
      await waitFor(() => {
        expect(screen.getByTestId('voucher-list')).toBeInTheDocument();
        expect(screen.getByText('receipt-1.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('SupplierPaymentsTab', () => {
    it('disables OK button in supplier modal when no vouchers are attached', async () => {
      const { SupplierPaymentsTab } = await loadComponents();
      const user = userEvent.setup();

      render(
        <Wrapper>
          <SupplierPaymentsTab
            orderId={1}
            supplierPayments={mockSupplierPayments}
            isLoading={false}
          />
        </Wrapper>
      );

      // Click edit on the first supplier card
      const editButtons = screen.getAllByText('编辑');
      await user.click(editButtons[0]);

      // Verify OK button is disabled
      await waitFor(() => {
        const okButton = document.querySelector(
          '.ant-modal-footer .ant-btn-primary'
        ) as HTMLButtonElement;
        expect(okButton).toBeTruthy();
        expect(okButton.disabled).toBe(true);
      });
    });

    it('displays VoucherList filtered by supplierId for each supplier', async () => {
      // Set payment records for multiple suppliers
      mockPaymentVouchersData.push(...mockSupplierPaymentRecords);
      const { SupplierPaymentsTab } = await loadComponents();

      render(
        <Wrapper>
          <SupplierPaymentsTab
            orderId={1}
            supplierPayments={mockSupplierPayments}
            isLoading={false}
          />
        </Wrapper>
      );

      // Verify voucher lists are present and contain supplier-specific files
      await waitFor(() => {
        const voucherLists = screen.getAllByTestId('voucher-list');
        expect(voucherLists.length).toBe(2);
      });

      // Supplier A's voucher
      expect(screen.getByText('invoice-1.pdf')).toBeInTheDocument();
      // Supplier B's voucher
      expect(screen.getByText('receipt-b.png')).toBeInTheDocument();
    });
  });
});
