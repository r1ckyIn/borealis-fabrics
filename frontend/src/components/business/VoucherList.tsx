/**
 * Read-only voucher list component with type-aware action buttons.
 * Groups vouchers by PaymentRecord with date and amount headers.
 * Append-only: no delete/remove actions.
 */

import { useState } from 'react';
import { List, Button, Space, Tag, Typography, Empty, Image } from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PaymentRecord, PaymentVoucher } from '@/types/entities.types';

export interface VoucherListProps {
  paymentRecords: PaymentRecord[];
}

/**
 * Format byte count to human-readable size string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get icon component based on MIME type.
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImageOutlined />;
  if (mimeType === 'application/pdf') return <FilePdfOutlined />;
  if (mimeType.includes('word')) return <FileWordOutlined />;
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return <FileExcelOutlined />;
  return <FileOutlined />;
}

/**
 * Determine action type based on MIME type.
 * - Images: inline preview
 * - PDF: open in new tab
 * - Office files: download
 */
function getFileAction(
  mimeType: string
): 'preview' | 'newtab' | 'download' {
  if (mimeType.startsWith('image/')) return 'preview';
  if (mimeType === 'application/pdf') return 'newtab';
  return 'download';
}

/**
 * Single voucher item with type-aware action button.
 */
function VoucherItem({ voucher }: { voucher: PaymentVoucher }) {
  const [previewVisible, setPreviewVisible] = useState(false);
  if (!voucher.file) return null;

  // Assign to const after null check so closure captures narrowed type
  const file = voucher.file;
  const action = getFileAction(file.mimeType);

  function handleAction() {
    if (action === 'preview') {
      setPreviewVisible(true);
    } else if (action === 'newtab') {
      window.open(file.url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName;
      link.click();
    }
  }

  const actionLabel =
    action === 'preview'
      ? 'Preview'
      : action === 'newtab'
        ? 'Open'
        : 'Download';
  const actionIcon =
    action === 'preview' ? <EyeOutlined /> : <DownloadOutlined />;

  return (
    <>
      <List.Item
        actions={[
          <Button
            key="action"
            type="link"
            size="small"
            icon={actionIcon}
            onClick={handleAction}
            data-testid={`voucher-action-${voucher.id}`}
          >
            {actionLabel}
          </Button>,
        ]}
      >
        <List.Item.Meta
          avatar={getFileIcon(file.mimeType)}
          title={file.originalName}
          description={
            <Space size="small">
              <span>{formatFileSize(file.size)}</span>
              <span>
                {dayjs(voucher.createdAt).format('YYYY-MM-DD HH:mm')}
              </span>
              {voucher.remark && <Tag>{voucher.remark}</Tag>}
            </Space>
          }
        />
      </List.Item>
      {action === 'preview' && (
        <Image
          style={{ display: 'none' }}
          preview={{
            open: previewVisible,
            src: file.url,
            onOpenChange: setPreviewVisible,
          }}
          src={file.url}
        />
      )}
    </>
  );
}

/**
 * Read-only voucher list grouped by payment record.
 * Shows file list with type-aware actions (preview/open/download).
 * No delete buttons (append-only policy).
 */
export function VoucherList({ paymentRecords }: VoucherListProps) {
  const recordsWithVouchers = paymentRecords.filter(
    (r) => r.vouchers && r.vouchers.length > 0
  );

  if (recordsWithVouchers.length === 0) {
    return (
      <Empty
        description="No vouchers uploaded"
        data-testid="voucher-list-empty"
      />
    );
  }

  return (
    <div data-testid="voucher-list">
      {recordsWithVouchers.map((record) => (
        <div key={record.id} style={{ marginBottom: 16 }}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
          >
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')} —{' '}
            ¥{record.amount}
            {record.payMethod ? ` (${record.payMethod})` : ''}
          </Typography.Text>
          <List
            size="small"
            dataSource={record.vouchers ?? []}
            renderItem={(voucher: PaymentVoucher) => (
              <VoucherItem key={voucher.id} voucher={voucher} />
            )}
          />
        </div>
      ))}
    </div>
  );
}
