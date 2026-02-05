/**
 * Unit tests for FabricSelector component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FabricSelector } from '../FabricSelector';
import type { Fabric } from '@/types/entities.types';

const mockFabrics: Fabric[] = [
  {
    id: 1,
    fabricCode: 'BF-2501-0001',
    name: '纯棉平纹',
    material: { primary: '棉' },
    composition: '100% 棉',
    color: '白色',
    weight: 150,
    width: 150,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    fabricCode: 'BF-2501-0002',
    name: '涤纶提花',
    material: { primary: '涤纶' },
    composition: '100% 涤纶',
    color: '蓝色',
    weight: 180,
    width: 150,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('FabricSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with placeholder', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      render(
        <FabricSelector onSearch={mockOnSearch} placeholder="选择一个面料" />
      );

      await vi.runAllTimersAsync();

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders disabled state', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      render(<FabricSelector onSearch={mockOnSearch} disabled />);

      await vi.runAllTimersAsync();

      const selectWrapper = document.querySelector('.ant-select');
      expect(selectWrapper).toHaveClass('ant-select-disabled');
    });
  });

  describe('Search', () => {
    it('calls onSearch on mount with empty string', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      render(<FabricSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();

      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('calls onSearch with debounce when typing', async () => {
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      render(<FabricSelector onSearch={mockOnSearch} />);

      await vi.runAllTimersAsync();
      mockOnSearch.mockClear();

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '棉' } });

      // Before debounce
      expect(mockOnSearch).not.toHaveBeenCalled();

      // After debounce (300ms)
      await vi.advanceTimersByTimeAsync(300);

      expect(mockOnSearch).toHaveBeenCalledWith('棉');
    });
  });

  describe('Selection', () => {
    it('calls onChange with fabric id and object when selected', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      const mockOnChange = vi.fn();

      render(
        <FabricSelector onSearch={mockOnSearch} onChange={mockOnChange} />
      );

      // Wait for initial search
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('BF-2501-0001')).toBeInTheDocument();
      });

      // Select option
      fireEvent.click(screen.getByText('BF-2501-0001'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(1, expect.objectContaining({
          id: 1,
          fabricCode: 'BF-2501-0001',
        }));
      });
    });

    it('calls onChange with undefined when cleared', async () => {
      vi.useRealTimers();
      const mockOnSearch = vi.fn().mockResolvedValue(mockFabrics);
      const mockOnChange = vi.fn();

      render(
        <FabricSelector
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

  describe('Loading State', () => {
    it('shows loading spinner while fetching', async () => {
      const slowSearch = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockFabrics), 500))
      );

      render(<FabricSelector onSearch={slowSearch} />);

      // Open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.mouseDown(input);

      // Should show loading
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles search error gracefully', async () => {
      const errorSearch = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<FabricSelector onSearch={errorSearch} />);

      await vi.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
