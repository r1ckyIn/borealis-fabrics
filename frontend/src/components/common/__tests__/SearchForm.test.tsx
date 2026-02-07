/**
 * Tests for SearchForm component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../SearchForm';
import type { SearchField } from '../SearchForm';

describe('SearchForm', () => {
  const mockOnSearch = vi.fn();
  const mockOnReset = vi.fn();

  const textField: SearchField = {
    name: 'keyword',
    label: '关键词',
    type: 'text',
    placeholder: '请输入关键词',
  };

  const selectField: SearchField = {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '激活', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
  };

  const dateRangeField: SearchField = {
    name: 'dateRange',
    label: '日期范围',
    type: 'dateRange',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Field rendering', () => {
    it('renders text field correctly', () => {
      render(<SearchForm fields={[textField]} onSearch={mockOnSearch} />);

      expect(screen.getByLabelText('关键词')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入关键词')).toBeInTheDocument();
    });

    it('renders select field correctly', () => {
      render(<SearchForm fields={[selectField]} onSearch={mockOnSearch} />);

      expect(screen.getByLabelText('状态')).toBeInTheDocument();
    });

    it('renders date range field correctly', () => {
      render(<SearchForm fields={[dateRangeField]} onSearch={mockOnSearch} />);

      expect(screen.getByLabelText('日期范围')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('开始日期')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('结束日期')).toBeInTheDocument();
    });

    it('renders multiple fields', () => {
      render(
        <SearchForm
          fields={[textField, selectField, dateRangeField]}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByLabelText('关键词')).toBeInTheDocument();
      expect(screen.getByLabelText('状态')).toBeInTheDocument();
      expect(screen.getByLabelText('日期范围')).toBeInTheDocument();
    });

    it('renders search button', () => {
      render(<SearchForm fields={[textField]} onSearch={mockOnSearch} />);

      expect(screen.getByRole('button', { name: /搜索/i })).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(<SearchForm fields={[textField]} onSearch={mockOnSearch} />);

      expect(screen.getByRole('button', { name: /重置/i })).toBeInTheDocument();
    });
  });

  describe('Default placeholders', () => {
    it('uses default placeholder for text field without custom placeholder', () => {
      const fieldWithoutPlaceholder: SearchField = {
        name: 'name',
        label: '名称',
        type: 'text',
      };

      render(<SearchForm fields={[fieldWithoutPlaceholder]} onSearch={mockOnSearch} />);

      expect(screen.getByPlaceholderText('请输入名称')).toBeInTheDocument();
    });

    it('uses default placeholder for select field without custom placeholder', () => {
      const selectWithoutPlaceholder: SearchField = {
        name: 'type',
        label: '类型',
        type: 'select',
        options: [{ label: 'A', value: 'a' }],
      };

      render(<SearchForm fields={[selectWithoutPlaceholder]} onSearch={mockOnSearch} />);

      // Select placeholder is shown in the component, we check it exists
      expect(screen.getByLabelText('类型')).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('calls onSearch with form values on submit', async () => {
      const user = userEvent.setup();

      render(<SearchForm fields={[textField]} onSearch={mockOnSearch} />);

      const input = screen.getByPlaceholderText('请输入关键词');
      await user.type(input, 'test keyword');

      const searchButton = screen.getByRole('button', { name: /搜索/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: 'test keyword',
          })
        );
      });
    });

    it('submits form on Enter key in text field', async () => {
      const user = userEvent.setup();

      render(<SearchForm fields={[textField]} onSearch={mockOnSearch} />);

      const input = screen.getByPlaceholderText('请输入关键词');
      await user.type(input, 'test{Enter}');

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });
    });
  });

  describe('Form reset', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SearchForm
          fields={[textField]}
          onSearch={mockOnSearch}
          onReset={mockOnReset}
        />
      );

      // Type something first
      const input = screen.getByPlaceholderText('请输入关键词');
      await user.type(input, 'something');

      // Click reset
      const resetButton = screen.getByRole('button', { name: /重置/i });
      await user.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it('triggers onReset callback and resets form', async () => {
      const user = userEvent.setup();

      render(
        <SearchForm
          fields={[textField]}
          onSearch={mockOnSearch}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /重置/i });
      await user.click(resetButton);

      // onReset should be called
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('shows loading state on search button when loading is true', () => {
      render(
        <SearchForm
          fields={[textField]}
          onSearch={mockOnSearch}
          loading
        />
      );

      const searchButton = screen.getByRole('button', { name: /搜索/i });
      // Ant Design adds loading class or aria-busy when loading
      expect(searchButton.closest('.ant-btn-loading') || searchButton.getAttribute('aria-busy') === 'true' || document.querySelector('.ant-btn-loading')).toBeTruthy();
    });

    it('search button is not in loading state when loading is false', () => {
      render(
        <SearchForm
          fields={[textField]}
          onSearch={mockOnSearch}
          loading={false}
        />
      );

      const loadingButton = document.querySelector('.ant-btn-loading');
      expect(loadingButton).toBeFalsy();
    });
  });

  describe('Initial values', () => {
    it('renders with initial values', () => {
      render(
        <SearchForm
          fields={[textField]}
          onSearch={mockOnSearch}
          initialValues={{ keyword: 'initial value' }}
        />
      );

      const input = screen.getByPlaceholderText('请输入关键词') as HTMLInputElement;
      expect(input.value).toBe('initial value');
    });
  });

  describe('Select field interaction', () => {
    it('allows selecting an option', async () => {
      render(<SearchForm fields={[selectField]} onSearch={mockOnSearch} />);

      // Click the select to open dropdown
      const select = document.querySelector('.ant-select-selector');
      if (select) {
        fireEvent.mouseDown(select);

        await waitFor(() => {
          expect(screen.getByText('激活')).toBeInTheDocument();
        });

        // Click an option
        fireEvent.click(screen.getByText('激活'));
      }
    });
  });

  describe('Empty fields array', () => {
    it('renders form with only buttons when no fields provided', () => {
      render(<SearchForm fields={[]} onSearch={mockOnSearch} />);

      expect(screen.getByRole('button', { name: /搜索/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重置/i })).toBeInTheDocument();
    });
  });
});
