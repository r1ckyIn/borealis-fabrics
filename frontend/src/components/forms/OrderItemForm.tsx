/**
 * Order item form row for use inside OrderForm's Form.List.
 * Renders a single order line item with fabric/supplier selectors,
 * quantity, prices, delivery date, notes, subtotal, and remove button.
 */

import { useMemo } from 'react';
import {
  Form,
  InputNumber,
  Input,
  DatePicker,
  Button,
  Row,
  Col,
  Typography,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

import { FabricSelector } from '@/components/business/FabricSelector';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import { getFabrics } from '@/api/fabric.api';
import { getSuppliers } from '@/api/supplier.api';
import { formatCurrency } from '@/utils/format';

const { Text } = Typography;

export interface OrderItemFormProps {
  /** Form.List field index */
  fieldName: number;
  /** Callback to remove this item */
  onRemove: () => void;
  /** Disable remove when only 1 item exists */
  removeDisabled?: boolean;
}

/** Search fabrics for selector. */
async function searchFabrics(keyword: string) {
  const result = await getFabrics({ keyword, pageSize: 20 });
  return result.items;
}

/** Search suppliers for selector. */
async function searchSuppliers(keyword: string) {
  const result = await getSuppliers({ keyword, pageSize: 20 });
  return result.items;
}

export function OrderItemForm({
  fieldName,
  onRemove,
  removeDisabled = false,
}: OrderItemFormProps) {
  const form = Form.useFormInstance();

  // Watch quantity and salePrice for subtotal calculation
  const quantity = Form.useWatch(['items', fieldName, 'quantity'], form);
  const salePrice = Form.useWatch(['items', fieldName, 'salePrice'], form);

  const subtotal = useMemo(() => {
    if (quantity && salePrice) {
      return quantity * salePrice;
    }
    return 0;
  }, [quantity, salePrice]);

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
      <Row gutter={12}>
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            name={[fieldName, 'fabricId']}
            label="面料"
            rules={[{ required: true, message: '请选择面料' }]}
          >
            <FabricSelector
              onSearch={searchFabrics}
              placeholder="请选择面料"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Form.Item name={[fieldName, 'supplierId']} label="供应商">
            <SupplierSelector
              onSearch={searchSuppliers}
              placeholder="请选择供应商（可选）"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Form.Item
            name={[fieldName, 'quantity']}
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="数量"
              style={{ width: '100%' }}
              min={0.01}
              max={1000000}
              precision={2}
              addonAfter="米"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Form.Item
            name={[fieldName, 'salePrice']}
            label="销售单价"
            rules={[
              { required: true, message: '请输入销售单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="单价"
              style={{ width: '100%' }}
              min={0.01}
              max={100000}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={12} sm={8} md={5}>
          <Form.Item
            name={[fieldName, 'purchasePrice']}
            label="采购单价"
          >
            <InputNumber
              placeholder="采购价（可选）"
              style={{ width: '100%' }}
              min={0.01}
              max={100000}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Form.Item name={[fieldName, 'deliveryDate']} label="交货日期">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="交货日期"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={16} md={10}>
          <Form.Item
            name={[fieldName, 'notes']}
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <Input placeholder="备注（可选）" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Form.Item label="小计">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>{formatCurrency(subtotal)}</Text>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={onRemove}
                disabled={removeDisabled}
                title="删除此明细"
              />
            </div>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
