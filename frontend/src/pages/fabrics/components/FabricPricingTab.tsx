/**
 * Fabric customer pricing tab content.
 * Renders pricing table and add/edit modal.
 */

import { useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { CustomerSelector } from '@/components/business/CustomerSelector';
import { formatCurrency } from '@/utils';
import type { CustomerPricing, PaginatedResult } from '@/types';
import type { PricingModalControl } from '@/hooks/useFabricDetail';

export interface FabricPricingTabProps {
  pricing: PaginatedResult<CustomerPricing> | undefined;
  isLoading: boolean;
  modal: PricingModalControl;
  onDelete: (pricingId: number) => Promise<void>;
}

export function FabricPricingTab({
  pricing,
  isLoading,
  modal,
  onDelete,
}: FabricPricingTabProps): React.ReactElement {
  const { searchCustomers, defaultPrice } = modal;
  const columns: ColumnsType<CustomerPricing> = useMemo(
    () => [
      {
        title: '客户名称',
        key: 'customerName',
        render: (_, record) => record.customer?.companyName ?? '-',
      },
      {
        title: '联系人',
        key: 'contact',
        render: (_, record) => record.customer?.contactName ?? '-',
      },
      {
        title: '特殊单价',
        dataIndex: 'specialPrice',
        key: 'specialPrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '默认单价',
        key: 'defaultPrice',
        align: 'right',
        render: () => <AmountDisplay value={defaultPrice} suffix="/米" />,
      },
      {
        title: '差价',
        key: 'difference',
        align: 'right',
        render: (_, record) => {
          const diff = (record.specialPrice ?? 0) - (defaultPrice ?? 0);
          return <AmountDisplay value={diff} colorize showSign suffix="/米" />;
        },
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
              onClick={() => modal.onEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除此定价吗？"
              onConfirm={() => onDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [defaultPrice, modal.onEdit, onDelete]
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={modal.onOpen}>
          添加客户定价
        </Button>
      </div>
      <Table<CustomerPricing>
        columns={columns}
        dataSource={pricing?.items ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      {/* Add/Edit Pricing Modal */}
      <Modal
        title={modal.mode === 'add' ? '添加客户定价' : '编辑客户定价'}
        open={modal.open}
        onOk={modal.onSubmit}
        onCancel={modal.onClose}
        confirmLoading={modal.isSubmitting}
        destroyOnClose
      >
        <Form form={modal.form} layout="vertical">
          <Form.Item
            name="customerId"
            label="选择客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <CustomerSelector
              disabled={modal.mode === 'edit'}
              onSearch={searchCustomers}
            />
          </Form.Item>
          <Form.Item
            name="specialPrice"
            label="特殊单价 (元/米)"
            rules={[
              { required: true, message: '请输入特殊单价' },
              { type: 'number', min: 0, message: '单价必须大于0' },
            ]}
            extra={
              defaultPrice !== null && defaultPrice !== undefined
                ? `默认单价: ${formatCurrency(defaultPrice)}/米`
                : undefined
            }
          >
            <InputNumber
              placeholder="请输入特殊单价"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
