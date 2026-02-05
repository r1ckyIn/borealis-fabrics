/**
 * Reusable search/filter form component.
 * Supports text, select, and date range field types.
 */

import type { ReactNode } from 'react';
import { Button, Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

// =====================
// Types
// =====================

export interface SearchFieldOption {
  label: string;
  value: string | number;
}

export interface SearchField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'dateRange';
  placeholder?: string;
  options?: SearchFieldOption[];
}

export interface SearchFormProps {
  fields: SearchField[];
  onSearch: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  loading?: boolean;
  initialValues?: Record<string, unknown>;
}

// =====================
// Component
// =====================

export function SearchForm({
  fields,
  onSearch,
  onReset,
  loading = false,
  initialValues,
}: SearchFormProps): ReactNode {
  const [form] = Form.useForm();

  const handleFinish = (values: Record<string, unknown>): void => {
    onSearch(values);
  };

  const handleReset = (): void => {
    form.resetFields();
    onReset?.();
  };

  const renderField = (field: SearchField): ReactNode => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder ?? `请输入${field.label}`}
            allowClear
          />
        );

      case 'select':
        return (
          <Select
            placeholder={field.placeholder ?? `请选择${field.label}`}
            allowClear
            options={field.options}
            style={{ width: '100%' }}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            style={{ width: '100%' }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={initialValues}
    >
      <Row gutter={16}>
        {fields.map((field) => (
          <Col key={field.name} xs={24} sm={12} md={8} lg={6}>
            <Form.Item name={field.name} label={field.label}>
              {renderField(field)}
            </Form.Item>
          </Col>
        ))}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item label=" ">
            <Button.Group>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
              >
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Button.Group>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
