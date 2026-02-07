/**
 * Unit tests for ImportResultModal component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImportResultModal } from '../ImportResultModal';
import type { ImportResult } from '@/types';

const successResult: ImportResult = {
  successCount: 10,
  failureCount: 0,
  failures: [],
};

const mixedResult: ImportResult = {
  successCount: 8,
  failureCount: 2,
  failures: [
    { rowNumber: 3, identifier: 'FB-001', reason: 'Duplicate fabricCode' },
    { rowNumber: 7, identifier: 'FB-005', reason: 'Missing required field: name' },
  ],
};

describe('ImportResultModal', () => {
  it('renders modal with correct title for fabric import', () => {
    render(
      <ImportResultModal
        open={true}
        result={successResult}
        onClose={vi.fn()}
        importType="fabric"
      />
    );

    expect(screen.getByText('面料导入结果')).toBeInTheDocument();
  });

  it('renders modal with correct title for supplier import', () => {
    render(
      <ImportResultModal
        open={true}
        result={successResult}
        onClose={vi.fn()}
        importType="supplier"
      />
    );

    expect(screen.getByText('供应商导入结果')).toBeInTheDocument();
  });

  it('displays success and failure counts', () => {
    render(
      <ImportResultModal
        open={true}
        result={mixedResult}
        onClose={vi.fn()}
        importType="fabric"
      />
    );

    expect(screen.getByText(/成功: 8/)).toBeInTheDocument();
    expect(screen.getByText(/失败: 2/)).toBeInTheDocument();
  });

  it('shows failure table when there are failures', () => {
    render(
      <ImportResultModal
        open={true}
        result={mixedResult}
        onClose={vi.fn()}
        importType="fabric"
      />
    );

    expect(screen.getByText('失败详情:')).toBeInTheDocument();
    expect(screen.getByText('FB-001')).toBeInTheDocument();
    expect(screen.getByText('Duplicate fabricCode')).toBeInTheDocument();
    expect(screen.getByText('FB-005')).toBeInTheDocument();
    expect(screen.getByText('Missing required field: name')).toBeInTheDocument();
  });

  it('does not show failure table when all succeed', () => {
    render(
      <ImportResultModal
        open={true}
        result={successResult}
        onClose={vi.fn()}
        importType="fabric"
      />
    );

    expect(screen.queryByText('失败详情:')).not.toBeInTheDocument();
  });

  it('calls onClose when modal is closed', () => {
    const onClose = vi.fn();
    render(
      <ImportResultModal
        open={true}
        result={successResult}
        onClose={onClose}
        importType="fabric"
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing meaningful when result is null', () => {
    render(
      <ImportResultModal
        open={true}
        result={null}
        onClose={vi.fn()}
        importType="fabric"
      />
    );

    expect(screen.getByText('面料导入结果')).toBeInTheDocument();
    expect(screen.queryByText(/成功/)).not.toBeInTheDocument();
  });
});
