/**
 * Unit tests for VoucherList component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VoucherList } from '../VoucherList';
import type { PaymentRecord, PaymentVoucher, FileEntity } from '@/types/entities.types';

// Mock dayjs to keep date output stable
vi.mock('dayjs', async () => {
  const actual = await vi.importActual('dayjs');
  return actual;
});

/**
 * Build a mock FileEntity.
 */
function mockFile(overrides: Partial<FileEntity> = {}): FileEntity {
  return {
    id: 1,
    key: 'file-key',
    url: 'https://example.com/file.jpg',
    originalName: 'receipt.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    createdAt: '2026-01-15T10:30:00Z',
    ...overrides,
  };
}

/**
 * Build a mock PaymentVoucher.
 */
function mockVoucher(overrides: Partial<PaymentVoucher> = {}): PaymentVoucher {
  return {
    id: 1,
    paymentRecordId: 1,
    fileId: 1,
    createdAt: '2026-01-15T10:30:00Z',
    file: mockFile(),
    ...overrides,
  };
}

/**
 * Build a mock PaymentRecord with vouchers.
 */
function mockPaymentRecord(
  overrides: Partial<PaymentRecord> = {},
  vouchers: PaymentVoucher[] = []
): PaymentRecord {
  return {
    id: 1,
    orderId: 1,
    type: 'customer',
    amount: 5000,
    createdAt: '2026-01-15T10:00:00Z',
    vouchers,
    ...overrides,
  };
}

describe('VoucherList', () => {
  describe('Empty State', () => {
    it('renders empty state when vouchers array is empty', () => {
      render(<VoucherList paymentRecords={[]} />);
      expect(screen.getByTestId('voucher-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No vouchers uploaded')).toBeInTheDocument();
    });

    it('renders empty state when records have no vouchers', () => {
      const records = [mockPaymentRecord({}, [])];
      render(<VoucherList paymentRecords={records} />);
      expect(screen.getByTestId('voucher-list-empty')).toBeInTheDocument();
    });
  });

  describe('File Items Display', () => {
    it('renders file items with originalName', () => {
      const voucher = mockVoucher({
        file: mockFile({ originalName: 'bank-transfer.pdf' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      expect(screen.getByText('bank-transfer.pdf')).toBeInTheDocument();
    });

    it('renders formatted file size', () => {
      const voucher = mockVoucher({
        file: mockFile({ size: 1536000 }), // ~1.5 MB
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    });

    it('renders upload date', () => {
      const voucher = mockVoucher({
        createdAt: '2026-02-20T10:30:00Z',
      });
      const records = [
        mockPaymentRecord({ createdAt: '2026-01-15T10:00:00Z' }, [voucher]),
      ];
      render(<VoucherList paymentRecords={records} />);
      // Voucher date is different from record date, so getByText is unique
      expect(screen.getByText(/2026-02-20/)).toBeInTheDocument();
    });
  });

  describe('Type-Aware Action Buttons', () => {
    it('shows "Preview" button for image MIME types', () => {
      const voucher = mockVoucher({
        id: 10,
        file: mockFile({ mimeType: 'image/jpeg' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-10');
      expect(actionBtn).toHaveTextContent('Preview');
    });

    it('shows "Preview" button for png images', () => {
      const voucher = mockVoucher({
        id: 11,
        file: mockFile({ mimeType: 'image/png' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-11');
      expect(actionBtn).toHaveTextContent('Preview');
    });

    it('shows "Preview" button for webp images', () => {
      const voucher = mockVoucher({
        id: 12,
        file: mockFile({ mimeType: 'image/webp' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-12');
      expect(actionBtn).toHaveTextContent('Preview');
    });

    it('shows "Open" button for PDF files', () => {
      const voucher = mockVoucher({
        id: 20,
        file: mockFile({ mimeType: 'application/pdf', originalName: 'invoice.pdf' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-20');
      expect(actionBtn).toHaveTextContent('Open');
    });

    it('shows "Download" button for Word files', () => {
      const voucher = mockVoucher({
        id: 30,
        file: mockFile({ mimeType: 'application/msword', originalName: 'doc.doc' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-30');
      expect(actionBtn).toHaveTextContent('Download');
    });

    it('shows "Download" button for Excel files', () => {
      const voucher = mockVoucher({
        id: 31,
        file: mockFile({
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          originalName: 'report.xlsx',
        }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      const actionBtn = screen.getByTestId('voucher-action-31');
      expect(actionBtn).toHaveTextContent('Download');
    });
  });

  describe('Append-Only Policy', () => {
    it('does NOT render any delete button', () => {
      const voucher = mockVoucher({
        file: mockFile({ originalName: 'receipt.jpg' }),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      const { container } = render(<VoucherList paymentRecords={records} />);
      // Ensure no delete/remove buttons exist in the rendered output
      expect(container.textContent).not.toMatch(/delete/i);
      expect(container.textContent).not.toMatch(/remove/i);
    });
  });

  describe('Remark Display', () => {
    it('displays remark text when voucher has a remark', () => {
      const voucher = mockVoucher({
        remark: 'Wire transfer receipt',
        file: mockFile(),
      });
      const records = [mockPaymentRecord({}, [voucher])];
      render(<VoucherList paymentRecords={records} />);
      expect(screen.getByText('Wire transfer receipt')).toBeInTheDocument();
    });
  });

  describe('Grouping by PaymentRecord', () => {
    it('groups vouchers by PaymentRecord with date header', () => {
      const voucher1 = mockVoucher({
        id: 1,
        file: mockFile({ originalName: 'receipt1.jpg' }),
      });
      const voucher2 = mockVoucher({
        id: 2,
        file: mockFile({ originalName: 'receipt2.pdf', mimeType: 'application/pdf' }),
      });

      const record1 = mockPaymentRecord(
        { id: 1, amount: 3000, createdAt: '2026-01-10T08:00:00Z' },
        [voucher1]
      );
      const record2 = mockPaymentRecord(
        { id: 2, amount: 7000, createdAt: '2026-01-15T14:00:00Z' },
        [voucher2]
      );

      render(<VoucherList paymentRecords={[record1, record2]} />);

      // Both records should be rendered
      expect(screen.getByText('receipt1.jpg')).toBeInTheDocument();
      expect(screen.getByText('receipt2.pdf')).toBeInTheDocument();

      // Amount headers should be visible
      expect(screen.getByText(/3000/)).toBeInTheDocument();
      expect(screen.getByText(/7000/)).toBeInTheDocument();
    });
  });
});
