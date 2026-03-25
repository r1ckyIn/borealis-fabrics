/**
 * Product customer pricing tab content.
 * Renders pricing table with add/edit/delete modal.
 * Follows FabricPricingTab pattern.
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
import { CustomerSelector } from '@/components/business/CustomerSelector';
import { getProductPricing, createProductPricing, updateProductPricing, deleteProductPricing } from '@/api/product.api';
import { getCustomers } from '@/api/customer.api';
import { productKeys } from '@/hooks/queries/useProducts';
import { getErrorMessage } from '@/utils/errorMessages';
import type { ProductPricing, Customer, ApiError } from '@/types';

export interface ProductPricingTabProps {
  productId: number;
  defaultPrice?: number | null;
}

/** Modal state for add/edit pricing. */
interface ModalState {
  open: boolean;
  mode: 'add' | 'edit';
  editRecord?: ProductPricing;
}

export function ProductPricingTab({ productId, defaultPrice }: ProductPricingTabProps): React.ReactElement {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'add' });

  // Fetch product pricing
  const { data: pricingData, isLoading } = useQuery({
    queryKey: [...productKeys.detail(productId), 'pricing'],
    queryFn: () => getProductPricing(productId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { customerId: number; specialPrice: number }) =>
      createProductPricing(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'pricing'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { pricingId: number; specialPrice: number }) =>
      updateProductPricing(productId, data.pricingId, { specialPrice: data.specialPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'pricing'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pricingId: number) => deleteProductPricing(productId, pricingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...productKeys.detail(productId), 'pricing'] });
    },
  });

  // Modal handlers
  const openAdd = useCallback(() => {
    form.resetFields();
    setModal({ open: true, mode: 'add' });
  }, [form]);

  const openEdit = useCallback(
    (record: ProductPricing) => {
      form.setFieldsValue({
        customerId: record.customerId,
        specialPrice: record.specialPrice,
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
        await createMutation.mutateAsync(values);
        message.success('客户定价添加成功');
      } else if (modal.editRecord) {
        await updateMutation.mutateAsync({
          pricingId: modal.editRecord.id,
          specialPrice: values.specialPrice,
        });
        message.success('客户定价更新成功');
      }
      closeModal();
    } catch (error: unknown) {
      console.error('Pricing modal error:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [form, modal, createMutation, updateMutation, closeModal]);

  const handleDelete = useCallback(
    async (pricingId: number) => {
      try {
        await deleteMutation.mutateAsync(pricingId);
        message.success('客户定价已删除');
      } catch (error: unknown) {
        console.error('Delete pricing error:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [deleteMutation]
  );

  // Search customers for selector
  const searchCustomers = useCallback(
    async (keyword: string): Promise<Customer[]> =>
      (await getCustomers({ keyword, pageSize: 20 })).items,
    []
  );

  const columns: ColumnsType<ProductPricing> = useMemo(
    () => [
      {
        title: '客户名称',
        key: 'customerName',
        render: (_, record) => record.customer?.companyName ?? '-',
      },
      {
        title: '特殊价格',
        dataIndex: 'specialPrice',
        key: 'specialPrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} />,
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
              title="确定要删除此定价吗？"
              onConfirm={() => handleDelete(record.id)}
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
    [openEdit, handleDelete]
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          添加客户定价
        </Button>
      </div>
      <Table<ProductPricing>
        columns={columns}
        dataSource={pricingData?.items ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      {/* Add/Edit Pricing Modal */}
      <Modal
        title={modal.mode === 'add' ? '添加客户定价' : '编辑客户定价'}
        open={modal.open}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
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
            label="特殊价格"
            rules={[
              { required: true, message: '请输入特殊价格' },
              { type: 'number', min: 0, message: '价格必须大于0' },
            ]}
            extra={
              defaultPrice != null
                ? `默认单价: ¥${Number(defaultPrice).toFixed(2)}`
                : undefined
            }
          >
            <InputNumber
              placeholder="请输入特殊价格"
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
