/**
 * Unit tests for CustomerSelector component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerSelector } from '../CustomerSelector';
import { CreditType } from '@/types/enums.types';
import type { Customer } from '@/types/entities.types';

const mockCustomers: Customer[] = [
  {
    id: 1,
    companyName: '杭州服装有限公司',
    contactName: '王总',
    phone: '13800138001',
    email: 'wang@example.com',
    creditType: CreditType.CREDIT,
    creditDays: 30,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    companyName: '上海贸易公司',
    contactName: '李总',
    phone: '13900139002',
    creditType: CreditType.PREPAY,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('CustomerSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with placeholder', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      render(
        <CustomerSelector onSearch={mockOnSearch} placeholder="选择客户" />
      );

      await vi.runAllTimersAsync();

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders disabled state', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      render(<CustomerSelector onSearch={mockOnSearch} disabled />);

      await vi.runAllTimersAsync();

      const selectWrapper = document.querySelector('.ant-select');
      expect(selectWrapper).toHaveClass('ant-select-disabled');
    });
  });

  describe('Search', () => {
    it('calls onSearch on mount with empty string', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      render(<CustomerSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();

      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('calls onSearch with debounce when typing', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      render(<CustomerSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();
      mockOnSearch.mockClear();

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '杭州' } });

      // Before debounce
      expect(mockOnSearch).not.toHaveBeenCalled();

      // After debounce (300ms)
      await vi.advanceTimersByTimeAsync(300);

      expect(mockOnSearch).toHaveBeenCalledWith('杭州');
    });
  });

  describe('Selection', () => {
    it('calls onChange with customer id and object when selected', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      const mockOnChange = vi.fn();

      render(
        <CustomerSelector onSearch={mockOnSearch} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('杭州服装有限公司')).toBeInTheDocument();
      });

      // Select option
      fireEvent.click(screen.getByText('杭州服装有限公司'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(1, expect.objectContaining({
          id: 1,
          companyName: '杭州服装有限公司',
        }));
      });
    });

    it('calls onChange with undefined when cleared', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);
      const mockOnChange = vi.fn();

      render(
        <CustomerSelector
          value={1}
          onSearch={mockOnSearch}
          onChange={mockOnChange}
          allowClear
        />
      );

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Find and click clear button
      const clearBtn = document.querySelector('.ant-select-clear');
      if (clearBtn) {
        fireEvent.mouseDown(clearBtn);

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith(undefined, undefined);
        });
      }
    });
  });

  describe('Credit Type Display', () => {
    it('displays credit type tags in options', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockCustomers);

      render(<CustomerSelector onSearch={mockOnSearch} />);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('账期')).toBeInTheDocument();
        expect(screen.getByText('预付款')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles search error gracefully', async () => {
      const errorSearch = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<CustomerSelector onSearch={errorSearch} />);

      await vi.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
