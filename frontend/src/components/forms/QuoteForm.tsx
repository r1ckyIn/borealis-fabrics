/**
 * Quote form component for create/edit operations.
 * Contains customer/fabric selectors, quantity/price inputs, date picker,
 * and a calculated total display.
 */

import { useEffect, useMemo } from 'react';
import {
  Form,
  InputNumber,
  Button,
  Row,
  Col,
  Divider,
  Space,
  Input,
  DatePicker,
} from 'antd';
import type { FormInstance } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { CustomerSelector } from '@/components/business/CustomerSelector';
import { FabricSelector } from '@/components/business/FabricSelector';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { getCustomers } from '@/api/customer.api';
import { getFabrics } from '@/api/fabric.api';
import type { Quote, CreateQuoteData } from '@/types';

const { TextArea } = Input;

/** Internal form values type (validUntil is Dayjs, not string). */
interface QuoteFormValues {
  customerId: number;
  fabricId: number;
  quantity: number;
  unitPrice: number;
  validUntil: Dayjs;
  notes?: string;
}

export interface QuoteFormProps {
  /** Initial form values (for edit mode) */
  initialValues?: Quote | null;
  /** Callback when form is submitted */
  onSubmit: (values: CreateQuoteData) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Loading state for submit button */
  loading?: boolean;
  /** Form mode: create or edit */
  mode: 'create' | 'edit';
  /** Optional form instance reference */
  form?: FormInstance<QuoteFormValues>;
}

/** Search customers for selector. */
async function searchCustomers(keyword: string) {
  const result = await getCustomers({ keyword, pageSize: 20 });
  return result.items;
}

/** Search fabrics for selector. */
async function searchFabrics(keyword: string) {
  const result = await getFabrics({ keyword, pageSize: 20 });
  return result.items;
}

/** Disable past dates but allow today. */
function disabledDate(current: Dayjs): boolean {
  return current.isBefore(dayjs(), 'day');
}

export function QuoteForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode,
  form: externalForm,
}: QuoteFormProps): React.ReactElement {
  const [internalForm] = Form.useForm<QuoteFormValues>();
  const form = externalForm ?? internalForm;

  // Watch quantity and unitPrice for calculated total
  const quantity = Form.useWatch('quantity', form);
  const unitPrice = Form.useWatch('unitPrice', form);

  const totalPrice = useMemo(() => {
    if (quantity && unitPrice) {
      return quantity * unitPrice;
    }
    return null;
  }, [quantity, unitPrice]);

  // Set initial values when in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        customerId: initialValues.customerId,
        fabricId: initialValues.fabricId,
        quantity: Number(initialValues.quantity),
        unitPrice: Number(initialValues.unitPrice),
        validUntil: dayjs(initialValues.validUntil),
        notes: initialValues.notes ?? undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  /** Convert internal form values to CreateQuoteData and submit. */
  async function handleFinish(values: QuoteFormValues): Promise<void> {
    const submitData: CreateQuoteData = {
      ...values,
      validUntil: values.validUntil.format('YYYY-MM-DD'),
    };
    await onSubmit(submitData);
  }

  const isEditMode = mode === 'edit';

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      scrollToFirstError
    >
      {/* Quote Information */}
      <Divider titlePlacement="left">报价信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="customerId"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <CustomerSelector
              onSearch={searchCustomers}
              disabled={isEditMode}
              placeholder="请搜索并选择客户"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="fabricId"
            label="面料"
            rules={[{ required: true, message: '请选择面料' }]}
          >
            <FabricSelector
              onSearch={searchFabrics}
              disabled={isEditMode}
              placeholder="请搜索并选择面料"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
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
              max={1000000}
              precision={2}
              addonAfter="米"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="unitPrice"
            label="单价"
            rules={[
              { required: true, message: '请输入单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入单价"
              style={{ width: '100%' }}
              min={0.01}
              max={100000}
              precision={2}
              addonBefore="¥"
              addonAfter="/米"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="合计金额">
            <AmountDisplay value={totalPrice} />
          </Form.Item>
        </Col>
      </Row>

      {/* Validity and Notes */}
      <Divider titlePlacement="left">有效期与备注</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="validUntil"
            label="有效期至"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择有效期"
              disabledDate={disabledDate}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="notes"
            label="备注"
            rules={[{ max: 2000, message: '备注不能超过2000个字符' }]}
          >
            <TextArea
              placeholder="请输入备注"
              rows={3}
              showCount
              maxLength={2000}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Form Actions */}
      <Divider />
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEditMode ? '保存修改' : '创建报价'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default QuoteForm;
