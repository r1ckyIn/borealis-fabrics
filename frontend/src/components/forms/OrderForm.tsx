/**
 * Order form component for create/edit operations.
 * Create mode: customer selector, delivery address, notes, dynamic items list.
 * Edit mode: only delivery address and notes (items managed in detail page).
 */

import { useEffect, useMemo } from 'react';
import {
  Form,
  Button,
  Row,
  Col,
  Divider,
  Space,
  Input,
  Alert,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

import { CustomerSelector } from '@/components/business/CustomerSelector';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { OrderItemForm } from './OrderItemForm';
import { getCustomers } from '@/api/customer.api';
import type { Order, CreateOrderData } from '@/types';

const { TextArea } = Input;
const { Text } = Typography;

/** Internal form values type for items (deliveryDate is Dayjs). */
interface OrderItemFormValues {
  fabricId: number;
  supplierId?: number;
  quantity: number;
  salePrice: number;
  purchasePrice?: number;
  deliveryDate?: Dayjs;
  notes?: string;
}

/** Internal form values type. */
interface OrderFormValues {
  customerId: number;
  deliveryAddress?: string;
  notes?: string;
  items?: OrderItemFormValues[];
}

export interface OrderFormProps {
  initialValues?: Order | null;
  onSubmit: (values: CreateOrderData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode: 'create' | 'edit';
}

/** Search customers for selector. */
async function searchCustomers(keyword: string) {
  const result = await getCustomers({ keyword, pageSize: 20 });
  return result.items;
}

export function OrderForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode,
}: OrderFormProps): React.ReactElement {
  const [form] = Form.useForm<OrderFormValues>();
  const isEditMode = mode === 'edit';

  // Watch items for total calculation
  const items = Form.useWatch('items', form) as OrderItemFormValues[] | undefined;

  const totalAmount = useMemo(() => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const qty = item?.quantity ?? 0;
      const price = item?.salePrice ?? 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  // Set initial values for edit mode
  useEffect(() => {
    if (initialValues && isEditMode) {
      form.setFieldsValue({
        customerId: initialValues.customerId,
        deliveryAddress: initialValues.deliveryAddress ?? undefined,
        notes: initialValues.notes ?? undefined,
      });
    }
  }, [initialValues, isEditMode, form]);

  /** Convert form values to API data and submit. */
  async function handleFinish(values: OrderFormValues): Promise<void> {
    if (isEditMode) {
      // Edit mode only sends address/notes
      await onSubmit({
        customerId: values.customerId,
        deliveryAddress: values.deliveryAddress,
        notes: values.notes,
        items: [],
      });
    } else {
      await onSubmit({
        customerId: values.customerId,
        deliveryAddress: values.deliveryAddress,
        notes: values.notes,
        items: (values.items ?? []).map((item) => ({
          fabricId: item.fabricId,
          supplierId: item.supplierId,
          quantity: item.quantity,
          salePrice: item.salePrice,
          purchasePrice: item.purchasePrice,
          deliveryDate: item.deliveryDate?.format('YYYY-MM-DD'),
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
      {/* Customer Info */}
      <Divider titlePlacement="left">客户信息</Divider>
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
            name="deliveryAddress"
            label="交货地址"
            rules={[{ max: 500, message: '地址不能超过500个字符' }]}
          >
            <Input placeholder="请输入交货地址" />
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

      {/* Order Items (create mode only) */}
      {isEditMode ? (
        <Alert
          message="订单明细管理"
          description="请在订单详情页中管理订单明细项（添加、编辑、删除、状态变更）"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <>
          <Divider titlePlacement="left">订单明细</Divider>
          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请至少添加一项订单明细'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name }) => (
                  <OrderItemForm
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
            {isEditMode ? '保存修改' : '创建订单'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default OrderForm;
