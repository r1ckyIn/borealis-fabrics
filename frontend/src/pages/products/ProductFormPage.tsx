/**
 * Product form page for creating and editing products.
 * Dynamic spec fields driven by config object per subCategory.
 */

import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Divider,
  Space,
  Spin,
  Result,
  message,
} from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/queries/useProducts';
import { CATEGORY_ROUTE_MAP } from '@/utils/product-constants';
import { PRODUCT_SUB_CATEGORY_LABELS, ProductCategory } from '@/types';
import { parseEntityId } from '@/utils';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';
import type { CreateProductData, UpdateProductData, ApiError, Product } from '@/types';

const { TextArea } = Input;

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

// =============================================================================
// Config-driven spec fields
// =============================================================================

interface SpecFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

/** Spec fields per subCategory. Config-driven approach makes adding new categories trivial. */
const SPEC_FIELDS: Record<string, SpecFieldConfig[]> = {
  IRON_FRAME: [
    { name: 'modelNumber', label: '型号', type: 'text', required: true },
    { name: 'specification', label: '规格', type: 'text', placeholder: '如 3人位 L型' },
  ],
  MOTOR: [
    { name: 'modelNumber', label: '型号', type: 'text', required: true },
    { name: 'specification', label: '详细规格', type: 'text' },
  ],
  MATTRESS: [
    { name: 'specification', label: '规格尺寸', type: 'text', required: true, placeholder: '如 190x140x11cm' },
  ],
  ACCESSORY: [
    { name: 'modelNumber', label: '型号', type: 'text' },
    { name: 'specification', label: '规格', type: 'text' },
  ],
};

/** Render a form field based on spec config. */
function renderSpecInput(field: SpecFieldConfig): React.ReactElement {
  switch (field.type) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder ?? `请输入${field.label}`} />;
    case 'select':
      return <Select options={field.options} placeholder={field.placeholder ?? `请选择${field.label}`} allowClear />;
    case 'text':
    default:
      return <Input placeholder={field.placeholder ?? `请输入${field.label}`} />;
  }
}

/** Convert a Product entity to form-friendly values (null -> undefined). */
function productToFormValues(product: Product) {
  return {
    name: product.name,
    modelNumber: product.modelNumber ?? undefined,
    specification: product.specification ?? undefined,
    defaultPrice: product.defaultPrice ?? undefined,
    notes: product.notes ?? undefined,
  };
}

// =============================================================================
// Page Component
// =============================================================================

export default function ProductFormPage(): React.ReactElement {
  const { id, category: categoryParam } = useParams<{ id: string; category: string }>();
  const navigate = useNavigate();

  const [form] = Form.useForm<CreateProductData>();
  const isEditMode = !!id;
  const productId = parseEntityId(id);

  // Resolve subCategory from route
  const subCategory = categoryParam ? CATEGORY_ROUTE_MAP[categoryParam] : undefined;
  const categoryLabel = subCategory
    ? PRODUCT_SUB_CATEGORY_LABELS[subCategory as keyof typeof PRODUCT_SUB_CATEGORY_LABELS]
    : '产品';

  // Fetch existing product for edit mode
  const {
    data: product,
    isLoading: isLoadingProduct,
    error: fetchError,
  } = useProduct(productId, isEditMode);

  // Mutations
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Populate form in edit mode
  useEffect(() => {
    if (product) {
      form.setFieldsValue(productToFormValues(product));
    }
  }, [product, form]);

  // Get spec fields for current category
  const specFields = subCategory ? SPEC_FIELDS[subCategory] ?? [] : [];

  /** Handle form submission. */
  const handleSubmit = useCallback(
    async (values: CreateProductData): Promise<void> => {
      if (!subCategory) return;

      try {
        const data: CreateProductData = {
          ...values,
          category: ProductCategory.IRON_FRAME_MOTOR,
          subCategory,
        };

        if (isEditMode && productId) {
          await updateMutation.mutateAsync({
            id: productId,
            data: data as UpdateProductData,
          });
          message.success('产品更新成功');
          navigate(`/products/${categoryParam}/${productId}`);
        } else {
          await createMutation.mutateAsync(data);
          message.success('产品创建成功');
          navigate(`/products/${categoryParam}`);
        }
      } catch (error: unknown) {
        logger.error('Submit error', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [subCategory, isEditMode, productId, createMutation, updateMutation, navigate, categoryParam]
  );

  /** Navigate back to list. */
  const goToList = useCallback(
    () => navigate(`/products/${categoryParam}`),
    [navigate, categoryParam]
  );

  // Breadcrumbs
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: `${categoryLabel}管理`, path: `/products/${categoryParam}` },
    { label: isEditMode ? `编辑${categoryLabel}` : `新增${categoryLabel}` },
  ];

  // Handle unknown category
  if (!subCategory) {
    return (
      <PageContainer title="未知分类">
        <Result
          status="404"
          title="未知分类"
          subTitle={`路径 "${categoryParam}" 不是有效的产品分类`}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Edit mode loading/error states
  if (isEditMode) {
    if (isLoadingProduct) {
      return (
        <PageContainer title="加载中..." breadcrumbs={breadcrumbs}>
          <Card>
            <div style={LOADING_STYLE}>
              <Spin size="large" />
            </div>
          </Card>
        </PageContainer>
      );
    }

    if (fetchError) {
      return (
        <PageContainer title="错误" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="error"
              title="加载失败"
              subTitle="无法加载产品信息，请稍后重试"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }

    if (!product) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="产品不存在"
              subTitle="您访问的产品不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={`${isEditMode ? '编辑' : '新增'}${categoryLabel}`}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          scrollToFirstError
        >
          {/* Common fields */}
          <Divider titlePlacement="left">基本信息</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="name"
                label="产品名称"
                rules={[
                  { required: true, message: '请输入产品名称' },
                  { max: 100, message: '产品名称不能超过100个字符' },
                ]}
              >
                <Input placeholder="请输入产品名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="defaultPrice"
                label="默认单价"
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
          </Row>

          {/* Dynamic spec fields */}
          {specFields.length > 0 && (
            <>
              <Divider titlePlacement="left">规格参数</Divider>
              <Row gutter={16}>
                {specFields.map((field) => (
                  <Col xs={24} sm={12} md={8} key={field.name}>
                    <Form.Item
                      name={field.name}
                      label={field.label}
                      rules={
                        field.required
                          ? [{ required: true, message: `请输入${field.label}` }]
                          : []
                      }
                    >
                      {renderSpecInput(field)}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </>
          )}

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

          {/* Form actions */}
          <Divider />
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {isEditMode ? '保存修改' : `创建${categoryLabel}`}
              </Button>
              <Button onClick={goToList}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
}
