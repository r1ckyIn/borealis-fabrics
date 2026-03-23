/**
 * Customer pricing tab content.
 * Renders pricing table with add/edit modal and delete confirmation.
 */

import { useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FabricSelector } from '@/components/business/FabricSelector';
import type { CustomerPricing } from '@/types';
import type {
  PricingModalControl,
  DeletePricingControl,
} from '@/hooks/useCustomerDetail';

const { Text } = Typography;

export interface CustomerPricingTabProps {
  pricing: CustomerPricing[] | undefined;
  isLoading: boolean;
  modal: PricingModalControl;
  deletePricing: DeletePricingControl;
  onNavigateToFabric: (fabricId: number) => void;
}

/**
 * Renders the pricing table, add/edit modal, and delete confirmation.
 */
export function CustomerPricingTab({
  pricing,
  isLoading,
  modal,
  deletePricing,
  onNavigateToFabric,
}: CustomerPricingTabProps): React.ReactElement {
  // Pricing table columns
  const columns: ColumnsType<CustomerPricing> = useMemo(
    () => [
      {
        title: '面料编码',
        key: 'fabricCode',
        width: 140,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => onNavigateToFabric(record.fabricId)}
            style={{ padding: 0 }}
          >
            {record.fabric?.fabricCode ?? '-'}
          </Button>
        ),
      },
      {
        title: '面料名称',
        key: 'fabricName',
        width: 180,
        ellipsis: true,
        render: (_, record) => record.fabric?.name ?? '-',
      },
      {
        title: '特殊价格',
        dataIndex: 'specialPrice',
        key: 'specialPrice',
        width: 120,
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => modal.onOpenEdit(record)}
            >
              编辑
            </Button>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deletePricing.onOpen(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [onNavigateToFabric, modal, deletePricing]
  );

  return (
    <>
      <div className="mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={modal.onOpenCreate}
        >
          添加定价
        </Button>
      </div>
      <Table<CustomerPricing>
        columns={columns}
        dataSource={pricing ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无特殊定价' }}
      />

      {/* Pricing Add/Edit Modal */}
      <Modal
        title={modal.editing ? '编辑特殊定价' : '添加特殊定价'}
        open={modal.open}
        onOk={modal.onSubmit}
        onCancel={modal.onClose}
        okText="保存"
        cancelText="取消"
        confirmLoading={modal.isSubmitting}
        width={500}
      >
        <Form form={modal.form} layout="vertical" className="mt-4">
          <Form.Item
            name="fabricId"
            label="面料"
            rules={[{ required: true, message: '请选择面料' }]}
          >
            <FabricSelector
              onSearch={modal.searchFabrics}
              disabled={!!modal.editing}
              placeholder="请搜索并选择面料"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="specialPrice"
            label="特殊价格"
            rules={[
              { required: true, message: '请输入特殊价格' },
              {
                type: 'number',
                min: 0,
                message: '价格不能为负数',
              },
            ]}
          >
            <InputNumber
              placeholder="请输入特殊价格"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              addonAfter="元/米"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Pricing Confirmation Modal */}
      <ConfirmModal
        open={deletePricing.open}
        title="确认删除"
        content={
          <>
            确定要删除面料{' '}
            <Text strong>"{deletePricing.target?.fabric?.fabricCode}"</Text> 的特殊定价吗？
          </>
        }
        onConfirm={deletePricing.onConfirm}
        onCancel={deletePricing.onClose}
        confirmText="删除"
        danger
        loading={deletePricing.isDeleting}
      />
    </>
  );
}
