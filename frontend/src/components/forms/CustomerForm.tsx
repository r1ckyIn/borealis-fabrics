/**
 * Customer form component for create/edit operations.
 * Contains all customer fields with validation, conditional creditDays logic,
 * and integrated AddressManager for managing multiple addresses.
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

import { AddressManager } from '@/components/business/AddressManager';
import type { Customer, CreateCustomerData } from '@/types';
import { CreditType, CREDIT_TYPE_LABELS } from '@/types';

const { TextArea } = Input;

export interface CustomerFormProps {
  /** Initial form values (for edit mode) */
  initialValues?: Customer | null;
  /** Callback when form is submitted */
  onSubmit: (values: CreateCustomerData) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Loading state for submit button */
  loading?: boolean;
  /** Form mode: create or edit */
  mode: 'create' | 'edit';
  /** Optional form instance reference */
  form?: FormInstance<CreateCustomerData>;
}

/** Credit type options for Select. */
const CREDIT_TYPE_OPTIONS = Object.values(CreditType).map((value) => ({
  label: CREDIT_TYPE_LABELS[value],
  value,
}));

/** Convert Customer entity to form data format (null -> undefined). */
function customerToFormValues(customer: Customer): CreateCustomerData {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName ?? undefined,
    phone: customer.phone ?? undefined,
    wechat: customer.wechat ?? undefined,
    email: customer.email ?? undefined,
    addresses: customer.addresses ?? undefined,
    creditType: customer.creditType,
    creditDays: customer.creditDays ?? undefined,
    notes: customer.notes ?? undefined,
  };
}

export function CustomerForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode,
  form: externalForm,
}: CustomerFormProps): React.ReactElement {
  const [internalForm] = Form.useForm<CreateCustomerData>();
  const form = externalForm ?? internalForm;

  // Watch creditType for conditional creditDays validation
  const creditType = Form.useWatch('creditType', form);

  // Set initial values when in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(customerToFormValues(initialValues));
    }
  }, [initialValues, form]);

  // Clear creditDays when creditType is not 'credit'
  useEffect(() => {
    if (creditType !== CreditType.CREDIT) {
      form.setFieldValue('creditDays', undefined);
    }
  }, [creditType, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      scrollToFirstError
      initialValues={{
        creditType: CreditType.PREPAY,
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
      </Row>

      {/* Business Information */}
      <Divider titlePlacement="left">商务信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="creditType" label="结算方式">
            <Select
              placeholder="请选择结算方式"
              options={CREDIT_TYPE_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="creditDays"
            label="账期天数"
            rules={[
              {
                required: creditType === CreditType.CREDIT,
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
              creditType === CreditType.CREDIT
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
              disabled={creditType !== CreditType.CREDIT}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Addresses */}
      <Divider titlePlacement="left">收货地址</Divider>
      <Form.Item name="addresses">
        <AddressManager maxAddresses={10} />
      </Form.Item>

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
            {mode === 'edit' ? '保存修改' : '创建客户'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default CustomerForm;
