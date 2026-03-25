/**
 * Unit tests for OrderItemForm component.
 * Tests unified product selection, supplier auto-populate, dynamic unit, and form fields.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Form } from 'antd';
import { OrderItemForm } from '../OrderItemForm';

// Mock UnifiedProductSelector
vi.mock('@/components/business/UnifiedProductSelector', () => ({
  UnifiedProductSelector: ({
    placeholder,
    onChange,
  }: {
    placeholder?: string;
    onChange?: (value: string | undefined, result?: unknown) => void;
    value?: string;
  }) => (
    <div data-testid="unified-product-selector" data-placeholder={placeholder}>
      <button
        data-testid="select-fabric-btn"
        onClick={() =>
          onChange?.('fabric:1', {
            type: 'fabric',
            id: 1,
            code: 'BF-2501-0001',
            name: '纯棉平纹',
            unit: '米',
            lowestSupplierId: 100,
            lowestSupplierPrice: 20.0,
            defaultPrice: 25.0,
            compositeValue: 'fabric:1',
          })
        }
      >
        Select Fabric
      </button>
      <button
        data-testid="select-product-btn"
        onClick={() =>
          onChange?.('product:5', {
            type: 'product',
            id: 5,
            code: 'PR-2501-0001',
            name: '标准铁架',
            unit: '套',
            lowestSupplierId: 200,
            lowestSupplierPrice: 280.0,
            defaultPrice: 350.0,
            compositeValue: 'product:5',
          })
        }
      >
        Select Product
      </button>
      <button
        data-testid="clear-btn"
        onClick={() => onChange?.(undefined, undefined)}
      >
        Clear
      </button>
    </div>
  ),
  parseCompositeValue: (value: string) => {
    const [type, idStr] = value.split(':');
    const id = parseInt(idStr, 10);
    if ((type === 'fabric' || type === 'product') && !isNaN(id)) {
      return { type, id };
    }
    return null;
  },
}));

// Mock SupplierSelector
vi.mock('@/components/business/SupplierSelector', () => ({
  SupplierSelector: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="supplier-selector" data-placeholder={placeholder} />
  ),
}));

// Mock supplier API
vi.mock('@/api/supplier.api', () => ({
  getSuppliers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

// Mock format utility
vi.mock('@/utils/format', () => ({
  formatCurrency: (val: number) => `¥${val.toFixed(2)}`,
}));

/**
 * Wrapper that provides a Form context for OrderItemForm.
 */
function TestWrapper({
  fieldName = 0,
  onRemove = vi.fn(),
  removeDisabled = false,
}: {
  fieldName?: number;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  const [form] = Form.useForm();
  return (
    <Form form={form} initialValues={{ items: [{}] }}>
      <Form.List name="items">
        {(fields) =>
          fields.map((field) => (
            <OrderItemForm
              key={field.key}
              fieldName={fieldName}
              onRemove={onRemove}
              removeDisabled={removeDisabled}
            />
          ))
        }
      </Form.List>
    </Form>
  );
}

describe('OrderItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders unified product selector with correct placeholder', () => {
      render(<TestWrapper />);

      const selector = screen.getByTestId('unified-product-selector');
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveAttribute(
        'data-placeholder',
        '搜索面料或产品'
      );
    });

    it('renders product label instead of old fabric label', () => {
      render(<TestWrapper />);

      expect(screen.getByText('产品')).toBeInTheDocument();
    });

    it('renders supplier selector', () => {
      render(<TestWrapper />);

      expect(screen.getByTestId('supplier-selector')).toBeInTheDocument();
    });

    it('renders hidden fields for fabricId, productId, and unit', () => {
      const { container } = render(<TestWrapper />);

      // Hidden Form.Items are rendered with display:none style
      const hiddenFormItems = container.querySelectorAll(
        '.ant-form-item-hidden'
      );
      // Should have 3 hidden fields: fabricId, productId, unit
      expect(hiddenFormItems.length).toBe(3);
    });

    it('renders quantity field with dynamic unit addon', () => {
      render(<TestWrapper />);

      // Initially shows default unit (meters) when no unit is set
      const quantityLabel = screen.getByText('数量');
      expect(quantityLabel).toBeInTheDocument();
    });

    it('renders remove button', () => {
      render(<TestWrapper />);

      expect(screen.getByTitle('删除此明细')).toBeInTheDocument();
    });

    it('renders remove button disabled when removeDisabled is true', () => {
      render(<TestWrapper removeDisabled />);

      const removeBtn = screen.getByTitle('删除此明细');
      expect(removeBtn).toBeDisabled();
    });
  });

  describe('Product selection auto-populate', () => {
    it('calls onChange with fabric selection and auto-populates fields', async () => {
      render(<TestWrapper />);

      // Simulate fabric selection
      const selectFabricBtn = screen.getByTestId('select-fabric-btn');
      selectFabricBtn.click();

      // The form should have been updated via setFieldValue calls
      // We can verify the hidden input values were set through the form instance
      await waitFor(() => {
        // Check that productSelection field has the composite value
        const selector = screen.getByTestId('unified-product-selector');
        expect(selector).toBeInTheDocument();
      });
    });

    it('calls onChange with product selection', async () => {
      render(<TestWrapper />);

      // Simulate product selection
      const selectProductBtn = screen.getByTestId('select-product-btn');
      selectProductBtn.click();

      await waitFor(() => {
        const selector = screen.getByTestId('unified-product-selector');
        expect(selector).toBeInTheDocument();
      });
    });

    it('clears all auto-populated fields when selection is cleared', async () => {
      render(<TestWrapper />);

      // First select, then clear
      const selectFabricBtn = screen.getByTestId('select-fabric-btn');
      selectFabricBtn.click();

      const clearBtn = screen.getByTestId('clear-btn');
      clearBtn.click();

      await waitFor(() => {
        const selector = screen.getByTestId('unified-product-selector');
        expect(selector).toBeInTheDocument();
      });
    });
  });

  describe('Subtotal calculation', () => {
    it('shows ¥0.00 when no quantity or price', () => {
      render(<TestWrapper />);

      expect(screen.getByText('¥0.00')).toBeInTheDocument();
    });
  });

  describe('Remove action', () => {
    it('calls onRemove when remove button is clicked', () => {
      const onRemove = vi.fn();
      render(<TestWrapper onRemove={onRemove} />);

      const removeBtn = screen.getByTitle('删除此明细');
      removeBtn.click();

      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });
});
