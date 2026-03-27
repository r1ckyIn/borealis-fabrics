/**
 * ImportResultModal - Displays import operation results with success/failure statistics.
 */

import { Modal, Table, Tag, Space, Typography, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

import type { ImportResult, ImportFailure } from '@/types';

const { Text } = Typography;

export interface ImportResultModalProps {
  open: boolean;
  result: ImportResult | null;
  onClose: () => void;
  importType: 'fabric' | 'supplier' | 'purchaseOrder' | 'salesContract';
}

const IMPORT_TYPE_LABELS: Record<ImportResultModalProps['importType'], string> = {
  fabric: '面料',
  supplier: '供应商',
  purchaseOrder: '采购单',
  salesContract: '购销合同',
};

const failureColumns = [
  {
    title: '行号',
    dataIndex: 'rowNumber',
    key: 'rowNumber',
    width: 80,
  },
  {
    title: '标识',
    dataIndex: 'identifier',
    key: 'identifier',
    width: 160,
  },
  {
    title: '失败原因',
    dataIndex: 'reason',
    key: 'reason',
  },
];

export function ImportResultModal({
  open,
  result,
  onClose,
  importType,
}: ImportResultModalProps) {
  const label = IMPORT_TYPE_LABELS[importType];

  return (
    <Modal
      title={`${label}导入结果`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {result ? (
        <>
          <Space size="large" style={{ marginBottom: 16 }}>
            <Tag icon={<CheckCircleOutlined />} color="success">
              成功: {result.successCount}
            </Tag>
            {result.skippedCount > 0 && (
              <Tag icon={<MinusCircleOutlined />} color="warning">
                跳过: {result.skippedCount}
              </Tag>
            )}
            <Tag icon={<CloseCircleOutlined />} color="error">
              失败: {result.failureCount}
            </Tag>
          </Space>

          {result.failures.length > 0 && (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                失败详情:
              </Text>
              <Table<ImportFailure>
                columns={failureColumns}
                dataSource={result.failures}
                rowKey="rowNumber"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
              />
            </>
          )}
        </>
      ) : (
        <Empty description="暂无导入结果" />
      )}
    </Modal>
  );
}
