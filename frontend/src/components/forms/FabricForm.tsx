/**
 * Fabric form component for create/edit operations.
 * Contains all fabric fields with validation and responsive layout.
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

import type { Fabric, CreateFabricData } from '@/types';

const { TextArea } = Input;

export interface FabricFormProps {
  /** Initial form values (for edit mode) */
  initialValues?: Fabric | null;
  /** Callback when form is submitted */
  onSubmit: (values: CreateFabricData) => Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Loading state for submit button */
  loading?: boolean;
  /** Form mode: create or edit */
  mode: 'create' | 'edit';
  /** Optional form instance reference */
  form?: FormInstance<CreateFabricData>;
}

/** Hand feel options */
const HAND_FEEL_OPTIONS = [
  { label: '柔软', value: 'soft' },
  { label: '硬挺', value: 'stiff' },
  { label: '滑爽', value: 'smooth' },
  { label: '粗糙', value: 'rough' },
  { label: '蓬松', value: 'fluffy' },
];

/** Gloss level options */
const GLOSS_LEVEL_OPTIONS = [
  { label: '亮光', value: 'bright' },
  { label: '半光', value: 'semi' },
  { label: '哑光', value: 'matte' },
];

/** Application options */
const APPLICATION_OPTIONS = [
  { label: '服装', value: 'clothing' },
  { label: '家纺', value: 'home_textile' },
  { label: '工业', value: 'industrial' },
  { label: '户外', value: 'outdoor' },
  { label: '运动', value: 'sports' },
  { label: '内衣', value: 'underwear' },
  { label: '童装', value: 'kids' },
];

/** Convert Fabric entity to form data format (null -> undefined). */
function fabricToFormValues(fabric: Fabric): CreateFabricData {
  return {
    fabricCode: fabric.fabricCode,
    name: fabric.name,
    material: fabric.material ?? undefined,
    composition: fabric.composition ?? undefined,
    color: fabric.color ?? undefined,
    weight: fabric.weight ?? undefined,
    width: fabric.width ?? undefined,
    thickness: fabric.thickness ?? undefined,
    handFeel: fabric.handFeel ?? undefined,
    glossLevel: fabric.glossLevel ?? undefined,
    application: fabric.application ?? undefined,
    defaultPrice: fabric.defaultPrice ?? undefined,
    defaultLeadTime: fabric.defaultLeadTime ?? undefined,
    description: fabric.description ?? undefined,
    tags: fabric.tags ?? undefined,
    notes: fabric.notes ?? undefined,
  };
}

export function FabricForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode,
  form: externalForm,
}: FabricFormProps): React.ReactElement {
  const [internalForm] = Form.useForm<CreateFabricData>();
  const form = externalForm ?? internalForm;
  const isEditMode = mode === 'edit';

  // Set initial values when in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(fabricToFormValues(initialValues));
    }
  }, [initialValues, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      scrollToFirstError
    >
      {/* Basic Information */}
      <Divider titlePlacement="left">基本信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="fabricCode"
            label="面料编码"
            rules={[
              { required: true, message: '请输入面料编码' },
              { max: 50, message: '面料编码不能超过50个字符' },
            ]}
          >
            <Input
              placeholder="请输入面料编码"
              disabled={isEditMode}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="name"
            label="面料名称"
            rules={[
              { required: true, message: '请输入面料名称' },
              { max: 100, message: '面料名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入面料名称" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="color"
            label="颜色"
            rules={[{ max: 50, message: '颜色不能超过50个字符' }]}
          >
            <Input placeholder="请输入颜色" />
          </Form.Item>
        </Col>
      </Row>

      {/* Material Information */}
      <Divider titlePlacement="left">材质信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name={['material', 'primary']}
            label="主要材质"
            rules={[{ max: 50, message: '主要材质不能超过50个字符' }]}
          >
            <Input placeholder="如：涤纶、棉、羊毛" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name={['material', 'secondary']}
            label="次要材质"
            rules={[{ max: 50, message: '次要材质不能超过50个字符' }]}
          >
            <Input placeholder="如：氨纶、腈纶" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="composition"
            label="成分比例"
            rules={[{ max: 100, message: '成分比例不能超过100个字符' }]}
          >
            <Input placeholder="如：80%涤纶 20%棉" />
          </Form.Item>
        </Col>
      </Row>

      {/* Specifications */}
      <Divider titlePlacement="left">规格参数</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="weight"
            label="克重 (g/m²)"
            rules={[{ type: 'number', min: 0, message: '克重必须大于0' }]}
          >
            <InputNumber
              placeholder="请输入克重"
              style={{ width: '100%' }}
              min={0}
              precision={2}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="width"
            label="幅宽 (cm)"
            rules={[{ type: 'number', min: 0, message: '幅宽必须大于0' }]}
          >
            <InputNumber
              placeholder="请输入幅宽"
              style={{ width: '100%' }}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item
            name="thickness"
            label="厚度"
            rules={[{ max: 20, message: '厚度不能超过20个字符' }]}
          >
            <Input placeholder="如：薄、中、厚" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Form.Item name="handFeel" label="手感">
            <Select
              placeholder="请选择手感"
              allowClear
              options={HAND_FEEL_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="glossLevel" label="光泽度">
            <Select
              placeholder="请选择光泽度"
              allowClear
              options={GLOSS_LEVEL_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={16}>
          <Form.Item name="application" label="应用领域">
            <Select
              placeholder="请选择应用领域"
              mode="multiple"
              allowClear
              options={APPLICATION_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Pricing and Lead Time */}
      <Divider titlePlacement="left">价格与交期</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="defaultPrice"
            label="默认单价 (元/米)"
            rules={[{ type: 'number', min: 0, message: '单价必须大于0' }]}
          >
            <InputNumber
              placeholder="请输入默认单价"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="defaultLeadTime"
            label="默认交期 (天)"
            rules={[
              { type: 'number', min: 0, message: '交期必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入默认交期"
              style={{ width: '100%' }}
              min={0}
              precision={0}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Other Information */}
      <Divider titlePlacement="left">其他信息</Divider>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="tags" label="标签">
            <Select
              placeholder="输入标签后回车添加"
              mode="tags"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="description"
            label="面料描述"
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          >
            <TextArea
              placeholder="请输入面料描述"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="notes"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <TextArea
              placeholder="请输入备注"
              rows={2}
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
            {isEditMode ? '保存修改' : '创建面料'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default FabricForm;
