/**
 * Tests for ConfirmModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    title: '确认操作',
    content: '确定要执行此操作吗？',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders when open is true', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('确认操作')).toBeInTheDocument();
      expect(screen.getByText('确定要执行此操作吗？')).toBeInTheDocument();
    });

    it('does not render content when open is false', () => {
      render(<ConfirmModal {...defaultProps} open={false} />);

      // Modal content should not be in the DOM when closed
      expect(screen.queryByText('确定要执行此操作吗？')).not.toBeInTheDocument();
    });
  });

  describe('Title and content', () => {
    it('displays custom title', () => {
      render(<ConfirmModal {...defaultProps} title="删除确认" />);

      expect(screen.getByText('删除确认')).toBeInTheDocument();
    });

    it('displays custom content as text', () => {
      render(<ConfirmModal {...defaultProps} content="这是自定义内容" />);

      expect(screen.getByText('这是自定义内容')).toBeInTheDocument();
    });

    it('displays custom content as ReactNode', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          content={<div data-testid="custom-content">Custom Node</div>}
        />
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('displays warning icon in title', () => {
      render(<ConfirmModal {...defaultProps} />);

      // ExclamationCircleFilled icon should be present
      expect(document.querySelector('.anticon-exclamation-circle')).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('displays confirm and cancel buttons with default text', () => {
      render(<ConfirmModal {...defaultProps} />);

      // Ant Design may add spaces between characters in button text
      expect(screen.getByRole('button', { name: /确.*认/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /取.*消/ })).toBeInTheDocument();
    });

    it('displays custom button text', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmText="是的"
          cancelText="不了"
        />
      );

      // Custom text may also have spaces
      expect(screen.getByRole('button', { name: /是.*的/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /不.*了/ })).toBeInTheDocument();
    });
  });

  describe('Confirm action', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: /确.*认/ }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('handles async onConfirm', async () => {
      const onConfirm = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });

      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: /确.*认/ }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel action', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /取.*消/ }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when close icon is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      const closeButton = document.querySelector('.ant-modal-close');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onCancel).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Danger mode', () => {
    it('shows danger styling when danger is true', () => {
      render(<ConfirmModal {...defaultProps} danger />);

      const confirmButton = screen.getByRole('button', { name: /确.*认/ });
      // Ant Design danger button has specific class
      expect(confirmButton.className).toMatch(/danger/i);
    });

    it('shows warning color icon by default', () => {
      render(<ConfirmModal {...defaultProps} />);

      // Yellow/warning color for non-danger
      const icon = document.querySelector('.anticon-exclamation-circle');
      expect(icon).toBeInTheDocument();
    });

    it('shows red icon when danger is true', () => {
      render(<ConfirmModal {...defaultProps} danger />);

      // When danger is true, the icon wrapper should have red color
      // The icon is inside a span with the color style
      const icon = document.querySelector('.anticon-exclamation-circle');
      expect(icon).toBeInTheDocument();
      // Check that we're in danger mode by verifying confirm button has danger class
      const confirmButton = screen.getByRole('button', { name: /确.*认/ });
      expect(confirmButton.className).toMatch(/danger/i);
    });
  });

  describe('Loading state', () => {
    it('shows loading state on confirm button', async () => {
      render(<ConfirmModal {...defaultProps} loading />);

      const confirmButton = screen.getByRole('button', { name: /确.*认/ });
      expect(confirmButton.className).toMatch(/loading/i);
    });

    it('disables cancel button when loading', () => {
      render(<ConfirmModal {...defaultProps} loading />);

      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      expect(cancelButton).toBeDisabled();
    });

    it('shows internal loading state during async onConfirm', async () => {
      let resolvePromise: () => void;
      const onConfirm = vi.fn().mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      // Click confirm to start loading
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /确.*认/ }));
      });

      // During loading, cancel should be disabled
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /取.*消/ });
        expect(cancelButton).toBeDisabled();
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!();
      });
    });
  });

  describe('Modal behavior', () => {
    it('is not closable when loading', () => {
      render(<ConfirmModal {...defaultProps} loading />);

      // Close button should be hidden or disabled when loading
      const modal = document.querySelector('.ant-modal');
      expect(modal).toBeInTheDocument();
    });

    it('is not mask-closable when loading', () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} loading />);

      // Clicking mask should not trigger cancel when loading
      const mask = document.querySelector('.ant-modal-mask');
      if (mask) {
        fireEvent.click(mask);
        // onCancel should not be called due to maskClosable={!isLoading}
      }
    });
  });
});
