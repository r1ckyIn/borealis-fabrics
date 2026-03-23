/**
 * Add/edit order item modal with form fields for fabric, supplier,
 * quantity, pricing, delivery date, and notes.
 */

import { Modal, Form, Input, InputNumber, DatePicker } from 'antd';
import type { FormInstance } from 'antd';

import { FabricSelector } from '@/components/business/FabricSelector';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import { getFabrics } from '@/api/fabric.api';
import { getSuppliers } from '@/api/supplier.api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function searchFabrics(keyword: string) {
  const result = await getFabrics({ keyword, pageSize: 20 });
  return result.items;
}

async function searchSuppliers(keyword: string) {
  const result = await getSuppliers({ keyword, pageSize: 20 });
  return result.items;
}

// ---------------------------------------------------------------------------
// Shared form fields
// ---------------------------------------------------------------------------

function ItemFormFields({ isEdit }: { isEdit: boolean }): React.ReactElement {
  return (
    <>
      <Form.Item
        name="fabricId"
        label="面料"
        rules={[{ required: true, message: '请选择面料' }]}
      >
        <FabricSelector
          onSearch={searchFabrics}
          placeholder="请选择面料"
          disabled={isEdit}
        />
      </Form.Item>
      <Form.Item name="supplierId" label="供应商">
        <SupplierSelector
          onSearch={searchSuppliers}
          placeholder="请选择供应商（可选）"
        />
      </Form.Item>
      <Form.Item
        name="quantity"
        label="数量"
        rules={[
          { required: true, message: '请输入数量' },
          { type: 'number', min: 0.01, message: '数量必须大于0' },
        ]}
      >
        <InputNumber
          placeholder="请输入数量"
          style={{ width: '100%' }}
          min={0.01}
          precision={2}
          addonAfter="米"
        />
      </Form.Item>
      <Form.Item
        name="salePrice"
        label="销售单价"
        rules={[
          { required: true, message: '请输入销售单价' },
          { type: 'number', min: 0.01, message: '单价必须大于0' },
        ]}
      >
        <InputNumber
          placeholder="请输入销售单价"
          style={{ width: '100%' }}
          min={0.01}
          precision={2}
          prefix="¥"
        />
      </Form.Item>
      <Form.Item name="purchasePrice" label="采购单价">
        <InputNumber
          placeholder="采购价（可选）"
          style={{ width: '100%' }}
          min={0.01}
          precision={2}
          prefix="¥"
        />
      </Form.Item>
      <Form.Item name="deliveryDate" label="交货日期">
        <DatePicker style={{ width: '100%' }} placeholder="请选择交货日期" />
      </Form.Item>
      <Form.Item name="notes" label="备注">
        <Input.TextArea rows={2} placeholder="请输入备注" />
      </Form.Item>
    </>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrderItemFormModalProps {
  mode: 'add' | 'edit';
  open: boolean;
  form: FormInstance;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderItemFormModal({
  mode,
  open,
  form,
  onClose,
  onSubmit,
  isSubmitting,
}: OrderItemFormModalProps): React.ReactElement {
  const isEdit = mode === 'edit';
  const title = isEdit ? '编辑订单明细' : '添加订单明细';

  return (
    <Modal
      open={open}
      title={title}
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okButtonProps={{ disabled: isSubmitting }}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <ItemFormFields isEdit={isEdit} />
      </Form>
    </Modal>
  );
}
