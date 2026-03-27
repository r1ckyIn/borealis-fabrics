/**
 * Multi-item quote form component for create/edit operations.
 * Create mode: customer selector, validity date, notes, dynamic items list with UnifiedProductSelector.
 * Edit mode: only validUntil and notes (items managed in detail page).
 * Note: Quote form does NOT show supplier fields (customer-facing document).
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
  Alert,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { CustomerSelector } from '@/components/business/CustomerSelector';
import { UnifiedProductSelector } from '@/components/business/UnifiedProductSelector';
import { parseCompositeValue } from '@/utils/product-constants';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { getCustomers } from '@/api/customer.api';
import type { Quote, CreateQuoteData } from '@/types';

const { TextArea } = Input;
const { Text } = Typography;

/** Internal form values for a single quote item row. */
interface QuoteItemFormValues {
  productSelection?: string;
  fabricId?: number;
  productId?: number;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  notes?: string;
}

/** Internal form values type (validUntil is Dayjs, not string). */
interface QuoteFormValues {
  customerId: number;
  validUntil: Dayjs;
  notes?: string;
  items?: QuoteItemFormValues[];
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

/** Disable today and past dates (backend requires future date). */
function disabledDate(current: Dayjs): boolean {
  return !current.isAfter(dayjs(), 'day');
}

/**
 * Single quote item row sub-component.
 * Renders product selector, quantity, unitPrice, subtotal, notes, and remove button.
 */
function QuoteItemRow({
  fieldName,
  onRemove,
  removeDisabled,
}: {
  fieldName: number;
  onRemove: () => void;
  removeDisabled: boolean;
}) {
  const form = Form.useFormInstance();

  // Watch quantity, unitPrice, unit for dynamic calculations
  const quantity = Form.useWatch(['items', fieldName, 'quantity'], form);
  const unitPrice = Form.useWatch(['items', fieldName, 'unitPrice'], form);
  const unit = Form.useWatch(['items', fieldName, 'unit'], form);

  const subtotal = useMemo(() => {
    if (quantity && unitPrice) {
      return quantity * unitPrice;
    }
    return 0;
  }, [quantity, unitPrice]);

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 12,
        background: '#fafafa',
      }}
    >
      {/* Hidden fields for fabricId, productId, unit */}
      <Form.Item name={[fieldName, 'fabricId']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[fieldName, 'productId']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={[fieldName, 'unit']} hidden>
        <Input />
      </Form.Item>

      <Row gutter={12}>
        <Col xs={24} md={8}>
          <Form.Item
            name={[fieldName, 'productSelection']}
            label="产品"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <UnifiedProductSelector
              placeholder="搜索面料或产品"
              onChange={(compositeValue, result) => {
                if (result && compositeValue) {
                  const parsed = parseCompositeValue(compositeValue);
                  if (parsed) {
                    if (parsed.type === 'fabric') {
                      form.setFieldValue(
                        ['items', fieldName, 'fabricId'],
                        parsed.id
                      );
                      form.setFieldValue(
                        ['items', fieldName, 'productId'],
                        undefined
                      );
                    } else {
                      form.setFieldValue(
                        ['items', fieldName, 'productId'],
                        parsed.id
                      );
                      form.setFieldValue(
                        ['items', fieldName, 'fabricId'],
                        undefined
                      );
                    }
                    form.setFieldValue(
                      ['items', fieldName, 'unit'],
                      result.unit
                    );
                    // Auto-fill unitPrice from defaultPrice
                    if (result.defaultPrice != null) {
                      form.setFieldValue(
                        ['items', fieldName, 'unitPrice'],
                        result.defaultPrice
                      );
                    }
                  }
                } else {
                  // Cleared selection
                  form.setFieldValue(
                    ['items', fieldName, 'fabricId'],
                    undefined
                  );
                  form.setFieldValue(
                    ['items', fieldName, 'productId'],
                    undefined
                  );
                  form.setFieldValue(
                    ['items', fieldName, 'unit'],
                    undefined
                  );
                  form.setFieldValue(
                    ['items', fieldName, 'unitPrice'],
                    undefined
                  );
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={5}>
          <Form.Item
            name={[fieldName, 'quantity']}
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={1000000}
              precision={2}
              placeholder="数量"
              addonAfter={unit || '米'}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={5}>
          <Form.Item
            name={[fieldName, 'unitPrice']}
            label="单价"
            rules={[
              { required: true, message: '请输入单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={100000}
              precision={2}
              placeholder="单价"
              prefix="¥"
            />
          </Form.Item>
        </Col>
        <Col xs={20} md={4}>
          <Form.Item label="小计">
            <Text strong>
              <AmountDisplay value={subtotal} />
            </Text>
          </Form.Item>
        </Col>
        <Col xs={4} md={2}>
          <Form.Item label=" ">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={onRemove}
              disabled={removeDisabled}
              title="删除此明细"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={24}>
          <Form.Item
            name={[fieldName, 'notes']}
            label="备注"
            rules={[{ max: 2000, message: '备注不能超过2000个字符' }]}
          >
            <Input placeholder="备注（可选）" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
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
  const isEditMode = mode === 'edit';

  // Watch items for total calculation
  const items = Form.useWatch('items', form) as
    | QuoteItemFormValues[]
    | undefined;

  const totalAmount = useMemo(() => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const qty = item?.quantity ?? 0;
      const price = item?.unitPrice ?? 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  // Set initial values for edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        customerId: initialValues.customerId,
        validUntil: dayjs(initialValues.validUntil),
        notes: initialValues.notes ?? undefined,
        // In edit mode, populate items from existing quote for display
        items: (initialValues.items ?? []).map((item) => ({
          productSelection: item.fabricId
            ? `fabric:${item.fabricId}`
            : item.productId
              ? `product:${item.productId}`
              : undefined,
          fabricId: item.fabricId ?? undefined,
          productId: item.productId ?? undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          unit: item.unit,
          notes: item.notes ?? undefined,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  /** Convert internal form values to API data and submit. */
  async function handleFinish(values: QuoteFormValues): Promise<void> {
    if (isEditMode) {
      // Edit mode only sends header fields
      await onSubmit({
        customerId: values.customerId,
        validUntil: values.validUntil.format('YYYY-MM-DD'),
        notes: values.notes,
        items: [],
      });
    } else {
      await onSubmit({
        customerId: values.customerId,
        validUntil: values.validUntil.format('YYYY-MM-DD'),
        notes: values.notes,
        items: (values.items ?? []).map((item) => ({
          fabricId: item.fabricId ? Number(item.fabricId) : undefined,
          productId: item.productId ? Number(item.productId) : undefined,
          quantity: item.quantity!,
          unitPrice: item.unitPrice!,
          unit: item.unit,
          notes: item.notes,
        })),
      });
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      scrollToFirstError
      initialValues={!isEditMode ? { items: [{}] } : undefined}
    >
      {/* Quote Header */}
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
            name="validUntil"
            label="有效期至"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择有效期"
              disabledDate={disabledDate}
              popupClassName="hide-overflow-dates"
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

      {/* Quote Items */}
      {isEditMode ? (
        <Alert
          message="报价明细管理"
          description="请在报价详情页中管理报价明细项（添加、编辑、删除）"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <>
          <Divider titlePlacement="left">报价明细</Divider>
          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(
                      new Error('请至少添加一项报价明细')
                    );
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name }) => (
                  <QuoteItemRow
                    key={key}
                    fieldName={name}
                    onRemove={() => remove(name)}
                    removeDisabled={fields.length <= 1}
                  />
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                  style={{ marginBottom: 16 }}
                >
                  添加明细
                </Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>

          {/* Total Amount */}
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Col>
              <Text>合计金额：</Text>
              <AmountDisplay value={totalAmount} />
            </Col>
          </Row>
        </>
      )}

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
