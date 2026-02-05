/**
 * Unit tests for FabricForm component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Form } from 'antd';

import { FabricForm } from '../FabricForm';
import type { Fabric } from '@/types';

// Mock fabric data
const mockFabric: Fabric = {
  id: 1,
  fabricCode: 'FB-2401-0001',
  name: '高档涤纶面料',
  material: { primary: '涤纶', secondary: '氨纶' },
  composition: '80%涤纶 20%氨纶',
  color: '黑色',
  weight: 180.5,
  width: 150,
  thickness: '中',
  handFeel: 'soft',
  glossLevel: 'matte',
  application: ['clothing', 'sports'],
  defaultPrice: 25.5,
  defaultLeadTime: 7,
  description: '高品质面料',
  tags: ['热销', '高档'],
  notes: '库存充足',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('FabricForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render all form sections', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      // Check for section dividers
      await waitFor(() => {
        expect(screen.getByText('基本信息')).toBeInTheDocument();
      });
      expect(screen.getByText('材质信息')).toBeInTheDocument();
      expect(screen.getByText('规格参数')).toBeInTheDocument();
      expect(screen.getByText('价格与交期')).toBeInTheDocument();
      expect(screen.getByText('其他信息')).toBeInTheDocument();
    });

    it('should render required field labels', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('面料编码')).toBeInTheDocument();
      });
      expect(screen.getByText('面料名称')).toBeInTheDocument();
    });

    it('should render submit button with create text in create mode', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('创建面料')).toBeInTheDocument();
      });
    });

    it('should render submit button with save text in edit mode', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
          initialValues={mockFabric}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('保存修改')).toBeInTheDocument();
      });
    });

    it('should render cancel button', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      // Ant Design button inserts space between two Chinese characters
      await waitFor(() => {
        expect(screen.getByText(/取.*消/)).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    it('should disable fabricCode in edit mode', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
          initialValues={mockFabric}
        />
      );

      await waitFor(() => {
        const fabricCodeInput = document.querySelector('input#fabricCode');
        expect(fabricCodeInput).toBeDisabled();
      });
    });

    it('should enable fabricCode in create mode', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      await waitFor(() => {
        const fabricCodeInput = document.querySelector('input#fabricCode');
        expect(fabricCodeInput).not.toBeDisabled();
      });
    });
  });

  describe('Initial Values', () => {
    it('should populate form with initial values in edit mode', async () => {
      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
          initialValues={mockFabric}
        />
      );

      await waitFor(() => {
        const fabricCodeInput = document.querySelector('input#fabricCode') as HTMLInputElement;
        expect(fabricCodeInput?.value).toBe('FB-2401-0001');
      });

      const nameInput = document.querySelector('input#name') as HTMLInputElement;
      expect(nameInput?.value).toBe('高档涤纶面料');

      const colorInput = document.querySelector('input#color') as HTMLInputElement;
      expect(colorInput?.value).toBe('黑色');
    });
  });

  describe('Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      // Ant Design button inserts space between two Chinese characters
      await waitFor(() => {
        expect(screen.getByText(/取.*消/)).toBeInTheDocument();
      }, { timeout: 5000 });

      const cancelButton = screen.getByText(/取.*消/).closest('button');
      expect(cancelButton).toBeTruthy();
      await user.click(cancelButton!);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmit with form values on valid submission', async () => {
      const user = userEvent.setup();

      render(
        <FabricForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      // Wait for form to render
      await waitFor(() => {
        expect(document.querySelector('input#fabricCode')).toBeInTheDocument();
      });

      // Fill required fields
      const fabricCodeInput = document.querySelector('input#fabricCode') as HTMLInputElement;
      const nameInput = document.querySelector('input#name') as HTMLInputElement;

      await user.type(fabricCodeInput, 'FB-TEST-001');
      await user.type(nameInput, '测试面料');

      // Submit form
      const submitButton = screen.getByText('创建面料').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      }, { timeout: 10000 });

      // Check submitted values contain expected fields
      const submittedValues = mockOnSubmit.mock.calls[0][0];
      expect(submittedValues.fabricCode).toBe('FB-TEST-001');
      expect(submittedValues.name).toBe('测试面料');
    }, 15000);
  });

  describe('External Form Instance', () => {
    it('should use external form instance when provided', async () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();

        return (
          <FabricForm
            form={form}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
            mode="create"
          />
        );
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(document.querySelector('input#fabricCode')).toBeInTheDocument();
      });
    });
  });
});
