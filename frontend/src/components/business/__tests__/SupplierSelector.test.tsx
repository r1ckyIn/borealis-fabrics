/**
 * Unit tests for SupplierSelector component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupplierSelector } from '../SupplierSelector';
import { SupplierStatus, SettleType } from '@/types/enums.types';
import type { Supplier } from '@/types/entities.types';

const mockSuppliers: Supplier[] = [
  {
    id: 1,
    companyName: '广州纺织有限公司',
    contactName: '张经理',
    phone: '13800138001',
    wechat: 'weixin001',
    status: SupplierStatus.ACTIVE,
    settleType: SettleType.CREDIT,
    creditDays: 30,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    companyName: '深圳面料贸易',
    contactName: '李经理',
    phone: '13900139002',
    status: SupplierStatus.SUSPENDED,
    settleType: SettleType.PREPAY,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('SupplierSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with placeholder', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);
      render(
        <SupplierSelector onSearch={mockOnSearch} placeholder="选择供应商" />
      );

      await vi.runAllTimersAsync();

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders disabled state', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);
      render(<SupplierSelector onSearch={mockOnSearch} disabled />);

      await vi.runAllTimersAsync();

      const selectWrapper = document.querySelector('.ant-select');
      expect(selectWrapper).toHaveClass('ant-select-disabled');
    });
  });

  describe('Search', () => {
    it('calls onSearch on mount with empty string', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);
      render(<SupplierSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();

      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('calls onSearch with debounce when typing', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);
      render(<SupplierSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();
      mockOnSearch.mockClear();

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '广州' } });

      // Before debounce
      expect(mockOnSearch).not.toHaveBeenCalled();

      // After debounce (300ms)
      await vi.advanceTimersByTimeAsync(300);

      expect(mockOnSearch).toHaveBeenCalledWith('广州');
    });
  });

  describe('Selection', () => {
    it('calls onChange with supplier id and object when selected', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);
      const mockOnChange = vi.fn();

      render(
        <SupplierSelector onSearch={mockOnSearch} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('广州纺织有限公司')).toBeInTheDocument();
      });

      // Select option
      fireEvent.click(screen.getByText('广州纺织有限公司'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(1, expect.objectContaining({
          id: 1,
          companyName: '广州纺织有限公司',
        }));
      });
    });
  });

  describe('Status Display', () => {
    it('displays status tags in options', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockSuppliers);

      render(<SupplierSelector onSearch={mockOnSearch} />);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      await waitFor(() => {
        expect(screen.getByText('正常')).toBeInTheDocument();
        expect(screen.getByText('暂停')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles search error gracefully', async () => {
      const errorSearch = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SupplierSelector onSearch={errorSearch} />);

      await vi.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
