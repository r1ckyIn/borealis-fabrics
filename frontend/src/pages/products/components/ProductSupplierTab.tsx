/**
 * Product supplier association tab content.
 * Renders supplier table with add/edit/remove modal.
 * Follows FabricSupplierTab pattern.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import { getProductSuppliers, addProductSupplier, updateProductSupplier, removeProductSupplier } from '@/api/product.api';
import { getSuppliers } from '@/api/supplier.api';
import { productKeys } from '@/hooks/queries/useProducts';
import { getErrorMessage } from '@/utils/errorMessages';
import type { ProductSupplier, Supplier, ApiError } from '@/types';

export interface ProductSupplierTabProps {
  productId: number;
}

/** Modal state for add/edit supplier. */
interface ModalState {
  open: boolean;
  mode: 'add' | 'edit';
  editRecord?: ProductSupplier;
}

export function ProductSupplierTab({ productId }: ProductSupplierTabProps): React.ReactElement {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'add' });

  // Fetch product suppliers
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: [...productKeys.detail(productId), 'suppliers'],
    queryFn: () => getProductSuppliers(productId),
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (data: { supplierId: number; purchasePrice: number; minOrderQty?: number; leadTimeDays?: number }) =>
      addProductSupplier(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { supplierId: number; purchasePrice: number; minOrderQty?: number; leadTimeDays?: number }) =>
      updateProductSupplier(productId, data.supplierId, {
        purchasePrice: data.purchasePrice,
        minOrderQty: data.minOrderQty,
        leadTimeDays: data.leadTimeDays,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'suppliers'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (supplierId: number) => removeProductSupplier(productId, supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'suppliers'] });
    },
  });

  // Modal handlers
  const openAdd = useCallback(() => {
    form.resetFields();
    setModal({ open: true, mode: 'add' });
  }, [form]);

  const openEdit = useCallback(
    (record: ProductSupplier) => {
      form.setFieldsValue({
        supplierId: record.supplierId,
        purchasePrice: record.purchasePrice,
        minOrderQty: record.minOrderQty,
        leadTimeDays: record.leadTimeDays,
      });
      setModal({ open: true, mode: 'edit', editRecord: record });
    },
    [form]
  );

  const closeModal = useCallback(() => {
    setModal({ open: false, mode: 'add' });
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (modal.mode === 'add') {
        await addMutation.mutateAsync(values);
        message.success('供应商关联成功');
      } else if (modal.editRecord) {
        await updateMutation.mutateAsync({
          ...values,
          supplierId: modal.editRecord.supplierId,
        });
        message.success('供应商信息更新成功');
      }
      closeModal();
    } catch (error: unknown) {
      console.error('Supplier modal error:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [form, modal, addMutation, updateMutation, closeModal]);

  const handleRemove = useCallback(
    async (supplierId: number) => {
      try {
        await removeMutation.mutateAsync(supplierId);
        message.success('供应商已移除');
      } catch (error: unknown) {
        console.error('Remove supplier error:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [removeMutation]
  );

  // Search suppliers for selector
  const searchSuppliers = useCallback(
    async (keyword: string): Promise<Supplier[]> =>
      (await getSuppliers({ keyword, pageSize: 20 })).items,
    []
  );

  const columns: ColumnsType<ProductSupplier> = useMemo(
    () => [
      {
        title: '供应商名称',
        key: 'supplierName',
        render: (_, record) => record.supplier?.companyName ?? '-',
      },
      {
        title: '采购价',
        dataIndex: 'purchasePrice',
        key: 'purchasePrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} />,
      },
      {
        title: '最小起订量',
        dataIndex: 'minOrderQty',
        key: 'minOrderQty',
        align: 'right',
        render: (qty: number | null) => (qty != null ? qty : '-'),
      },
      {
        title: '交货周期',
        dataIndex: 'leadTimeDays',
        key: 'leadTimeDays',
        align: 'right',
        render: (days: number | null) => (days != null ? `${days} 天` : '-'),
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
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要移除此供应商吗？"
              onConfirm={() => handleRemove(record.supplierId)}
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
    [openEdit, handleRemove]
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          添加供应商
        </Button>
      </div>
      <Table<ProductSupplier>
        columns={columns}
        dataSource={suppliersData?.items ?? []}
        rowKey="supplierId"
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      {/* Add/Edit Supplier Modal */}
      <Modal
        title={modal.mode === 'add' ? '添加供应商' : '编辑供应商信息'}
        open={modal.open}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={addMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="supplierId"
            label="选择供应商"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <SupplierSelector
              disabled={modal.mode === 'edit'}
              onSearch={searchSuppliers}
            />
          </Form.Item>
          <Form.Item
            name="purchasePrice"
            label="采购价"
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
          <Form.Item name="minOrderQty" label="最小起订量">
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
