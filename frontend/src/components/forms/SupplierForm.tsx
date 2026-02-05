/**
 * Supplier form component for create/edit operations.
 * Contains all supplier fields with validation and conditional creditDays logic.
 */

import { useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Divider,
  Space,
} from 'antd';
import type { FormInstance } from 'antd';

import type { Supplier, CreateSupplierData } from '@/types';
import {
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  SettleType,
  SETTLE_TYPE_LABELS,
} from '@/types';

const { TextArea } = Input;

export interface SupplierFormProps {
  /** Initial form values (for edit mode) */
  initialValues?: Supplier | null;
  /** Callback when form is submitted */
  onSubmit: (values: CreateSupplierData) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Loading state for submit button */
  loading?: boolean;
  /** Form mode: create or edit */
  mode: 'create' | 'edit';
  /** Optional form instance reference */
  form?: FormInstance<CreateSupplierData>;
}

/** Supplier status options for Select. */
const STATUS_OPTIONS = Object.values(SupplierStatus).map((value) => ({
  label: SUPPLIER_STATUS_LABELS[value],
  value,
}));

/** Settlement type options for Select. */
const SETTLE_TYPE_OPTIONS = Object.values(SettleType).map((value) => ({
  label: SETTLE_TYPE_LABELS[value],
  value,
}));

/** Bill receive type options. */
const BILL_RECEIVE_TYPE_OPTIONS = [
  { label: '增值税专用发票', value: '增值税专用发票' },
  { label: '增值税普通发票', value: '增值税普通发票' },
  { label: '无需发票', value: '无需发票' },
];

/** Convert Supplier entity to form data format (null -> undefined). */
function supplierToFormValues(supplier: Supplier): CreateSupplierData {
  return {
    companyName: supplier.companyName,
    contactName: supplier.contactName ?? undefined,
    phone: supplier.phone ?? undefined,
    wechat: supplier.wechat ?? undefined,
    email: supplier.email ?? undefined,
    address: supplier.address ?? undefined,
    status: supplier.status,
    billReceiveType: supplier.billReceiveType ?? undefined,
    settleType: supplier.settleType,
    creditDays: supplier.creditDays ?? undefined,
    notes: supplier.notes ?? undefined,
  };
}

export function SupplierForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode,
  form: externalForm,
}: SupplierFormProps): React.ReactElement {
  const [internalForm] = Form.useForm<CreateSupplierData>();
  const form = externalForm ?? internalForm;
  const isEditMode = mode === 'edit';

  // Watch settleType for conditional creditDays validation
  const settleType = Form.useWatch('settleType', form);

  // Set initial values when in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(supplierToFormValues(initialValues));
    }
  }, [initialValues, form]);

  // Clear creditDays when settleType is not 'credit'
  useEffect(() => {
    if (settleType !== SettleType.CREDIT) {
      form.setFieldValue('creditDays', undefined);
    }
  }, [settleType, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      scrollToFirstError
      initialValues={{
        status: SupplierStatus.ACTIVE,
        settleType: SettleType.PREPAY,
      }}
    >
      {/* Basic Information */}
      <Divider titlePlacement="left">基本信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="companyName"
            label="公司名称"
            rules={[
              { required: true, message: '请输入公司名称' },
              { max: 200, message: '公司名称不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="contactName"
            label="联系人"
            rules={[{ max: 50, message: '联系人不能超过50个字符' }]}
          >
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="phone"
            label="电话"
            rules={[{ max: 30, message: '电话不能超过30个字符' }]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </Col>
      </Row>

      {/* Contact Information */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="wechat"
            label="微信"
            rules={[{ max: 50, message: '微信不能超过50个字符' }]}
          >
            <Input placeholder="请输入微信号" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
              { max: 100, message: '邮箱不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="status" label="状态">
            <Select
              placeholder="请选择状态"
              options={STATUS_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="address"
            label="地址"
            rules={[{ max: 500, message: '地址不能超过500个字符' }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
        </Col>
      </Row>

      {/* Business Information */}
      <Divider titlePlacement="left">商务信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="billReceiveType" label="发票类型">
            <Select
              placeholder="请选择发票类型"
              allowClear
              options={BILL_RECEIVE_TYPE_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="settleType" label="结算方式">
            <Select
              placeholder="请选择结算方式"
              options={SETTLE_TYPE_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="creditDays"
            label="账期天数"
            rules={[
              {
                required: settleType === SettleType.CREDIT,
                message: '请输入账期天数',
              },
              {
                type: 'number',
                min: 0,
                max: 365,
                message: '账期必须在0-365天之间',
              },
            ]}
            extra={
              settleType === SettleType.CREDIT
                ? '结算方式为账期时必填'
                : '仅结算方式为账期时可用'
            }
          >
            <InputNumber
              placeholder="请输入账期天数"
              style={{ width: '100%' }}
              min={0}
              max={365}
              precision={0}
              disabled={settleType !== SettleType.CREDIT}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Notes */}
      <Divider titlePlacement="left">其他信息</Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="notes"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <TextArea
              placeholder="请输入备注"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Form Actions */}
      <Divider />
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEditMode ? '保存修改' : '创建供应商'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default SupplierForm;
