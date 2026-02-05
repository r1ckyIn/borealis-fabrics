/**
 * Confirmation modal component for destructive or important actions.
 * Supports async confirmation with loading state.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

// =====================
// Types
// =====================

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

// =====================
// Component
// =====================

export function ConfirmModal({
  open,
  title,
  content,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  loading: externalLoading,
}: ConfirmModalProps): ReactNode {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async (): Promise<void> => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          <ExclamationCircleFilled
            style={{ color: danger ? '#ff4d4f' : '#faad14', marginRight: 8 }}
          />
          {title}
        </span>
      }
      onOk={handleConfirm}
      onCancel={onCancel}
      okText={confirmText}
      cancelText={cancelText}
      okButtonProps={{
        danger,
        loading: isLoading,
      }}
      cancelButtonProps={{
        disabled: isLoading,
      }}
      closable={!isLoading}
      maskClosable={!isLoading}
    >
      {content}
    </Modal>
  );
}
