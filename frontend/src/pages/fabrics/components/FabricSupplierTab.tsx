/**
 * Fabric supplier association tab content.
 * Renders supplier table and add/edit modal.
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
import { SupplierSelector } from '@/components/business/SupplierSelector';
import type { FabricSupplier, PaginatedResult } from '@/types';
import type { SupplierModalControl } from '@/hooks/useFabricDetail';

export interface FabricSupplierTabProps {
  suppliers: PaginatedResult<FabricSupplier> | undefined;
  isLoading: boolean;
  modal: SupplierModalControl;
  onRemove: (supplierId: number) => Promise<void>;
}

export function FabricSupplierTab({
  suppliers,
  isLoading,
  modal,
  onRemove,
}: FabricSupplierTabProps): React.ReactElement {
  const columns: ColumnsType<FabricSupplier> = useMemo(
    () => [
      {
        title: '供应商名称',
        key: 'supplierName',
        render: (_, record) => record.supplier?.companyName ?? '-',
      },
      {
        title: '联系人',
        key: 'contact',
        render: (_, record) => record.supplier?.contactName ?? '-',
      },
      {
        title: '采购价',
        dataIndex: 'purchasePrice',
        key: 'purchasePrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '最小起订量',
        dataIndex: 'minOrderQty',
        key: 'minOrderQty',
        align: 'right',
        render: (qty: number | null) => (qty !== null ? `${qty} 米` : '-'),
      },
      {
        title: '交货周期',
        dataIndex: 'leadTimeDays',
        key: 'leadTimeDays',
        align: 'right',
        render: (days: number | null) => (days !== null ? `${days} 天` : '-'),
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
              title="确定要移除此供应商吗？"
              onConfirm={() => onRemove(record.supplierId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                移除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [modal.onEdit, onRemove]
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={modal.onOpen}>
          添加供应商
        </Button>
      </div>
      <Table<FabricSupplier>
        columns={columns}
        dataSource={suppliers?.items ?? []}
        rowKey="supplierId"
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      {/* Add/Edit Supplier Modal */}
      <Modal
        title={modal.mode === 'add' ? '添加供应商' : '编辑供应商信息'}
        open={modal.open}
        onOk={modal.onSubmit}
        onCancel={modal.onClose}
        confirmLoading={modal.isSubmitting}
        destroyOnClose
      >
        <Form form={modal.form} layout="vertical">
          <Form.Item
            name="supplierId"
            label="选择供应商"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <SupplierSelector
              disabled={modal.mode === 'edit'}
              onSearch={modal.searchSuppliers}
            />
          </Form.Item>
          <Form.Item
            name="purchasePrice"
            label="采购价 (元/米)"
            rules={[
              { required: true, message: '请输入采购价' },
              { type: 'number', min: 0, message: '采购价必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入采购价"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item name="minOrderQty" label="最小起订量 (米)">
            <InputNumber
              placeholder="请输入最小起订量"
              style={{ width: '100%' }}
              min={0}
              precision={0}
            />
          </Form.Item>
          <Form.Item name="leadTimeDays" label="交货周期 (天)">
            <InputNumber
              placeholder="请输入交货周期"
              style={{ width: '100%' }}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
