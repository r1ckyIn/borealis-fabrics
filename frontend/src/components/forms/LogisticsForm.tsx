/**
 * Logistics form modal for creating and editing logistics entries.
 */

import { useEffect } from 'react';
import { Modal, Form, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Logistics, CreateLogisticsData, UpdateLogisticsData } from '@/types';

const { TextArea } = Input;

/** Internal form values type (shippedAt is Dayjs, not string). */
interface LogisticsFormValues {
  carrier: string;
  contactName?: string;
  contactPhone?: string;
  trackingNo?: string;
  shippedAt?: Dayjs;
  notes?: string;
}

export interface LogisticsFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Logistics | null;
  orderItemId?: number;
  onSubmit: (data: CreateLogisticsData | UpdateLogisticsData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function LogisticsForm({
  open,
  mode,
  initialValues,
  orderItemId,
  onSubmit,
  onCancel,
  loading = false,
}: LogisticsFormProps) {
  const [form] = Form.useForm<LogisticsFormValues>();
  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (open && initialValues && isEditMode) {
      form.setFieldsValue({
        carrier: initialValues.carrier,
        contactName: initialValues.contactName ?? undefined,
        contactPhone: initialValues.contactPhone ?? undefined,
        trackingNo: initialValues.trackingNo ?? undefined,
        shippedAt: initialValues.shippedAt ? dayjs(initialValues.shippedAt) : undefined,
        notes: initialValues.notes ?? undefined,
      });
    } else if (open && !isEditMode) {
      form.resetFields();
    }
  }, [open, initialValues, isEditMode, form]);

  async function handleOk(): Promise<void> {
    const values = await form.validateFields();

    const shared = {
      carrier: values.carrier,
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      trackingNo: values.trackingNo,
      shippedAt: values.shippedAt?.toISOString(),
      notes: values.notes,
    };

    if (isEditMode) {
      await onSubmit(shared as UpdateLogisticsData);
    } else {
      await onSubmit({ ...shared, orderItemId: orderItemId! } as CreateLogisticsData);
    }
  }

  return (
    <Modal
      open={open}
      title={isEditMode ? '编辑物流信息' : '添加物流信息'}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="carrier"
          label="物流公司"
          rules={[{ required: true, message: '请输入物流公司' }]}
        >
          <Input placeholder="请输入物流公司名称" />
        </Form.Item>

        <Form.Item name="contactName" label="联系人">
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>

        <Form.Item name="contactPhone" label="联系电话">
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item name="trackingNo" label="物流单号">
          <Input placeholder="请输入物流单号" />
        </Form.Item>

        <Form.Item name="shippedAt" label="发货日期">
          <DatePicker style={{ width: '100%' }} placeholder="请选择发货日期" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="备注"
          rules={[{ max: 500, message: '备注不能超过500个字符' }]}
        >
          <TextArea placeholder="请输入备注" rows={3} showCount maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
