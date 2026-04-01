/**
 * Product detail page with 3 tabs: basic info, suppliers, pricing.
 * Follows FabricDetailPage pattern.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Space,
  Spin,
  Result,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useProduct, useDeleteProduct } from '@/hooks/queries/useProducts';
import { CATEGORY_ROUTE_MAP } from '@/utils/product-constants';
import { CATEGORY_TAG_COLORS, CATEGORY_TAG_LABELS } from '@/utils/product-constants';
import { PRODUCT_SUB_CATEGORY_LABELS } from '@/types';
import { parseEntityId } from '@/utils';
import { getDeleteErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';
import type { ApiError } from '@/types';

import { ProductBasicInfo } from './components/ProductBasicInfo';
import { ProductSupplierTab } from './components/ProductSupplierTab';
import { ProductPricingTab } from './components/ProductPricingTab';

const { Text } = Typography;
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

export default function ProductDetailPage(): React.ReactElement {
  const { id, category: categoryParam } = useParams<{ id: string; category: string }>();
  const navigate = useNavigate();
  const productId = parseEntityId(id);

  // Resolve category label for breadcrumb
  const subCategoryFromRoute = categoryParam ? CATEGORY_ROUTE_MAP[categoryParam] : undefined;
  const categoryLabel = subCategoryFromRoute
    ? PRODUCT_SUB_CATEGORY_LABELS[subCategoryFromRoute as keyof typeof PRODUCT_SUB_CATEGORY_LABELS]
    : '产品';

  // Fetch product
  const { data: product, isLoading, error: fetchError } = useProduct(productId);

  // Delete mutation
  const deleteMutation = useDeleteProduct();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('info');

  // Navigation
  const goToList = useCallback(
    () => navigate(`/products/${categoryParam}`),
    [navigate, categoryParam]
  );

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!productId) return;
    try {
      await deleteMutation.mutateAsync(productId);
      message.success('产品已删除');
      goToList();
    } catch (error) {
      logger.error('Delete product failed', error);
      message.error(getDeleteErrorMessage(error as ApiError, '产品'));
    }
  }, [productId, deleteMutation, goToList]);

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: `${categoryLabel}管理`, path: `/products/${categoryParam}` },
      { label: product?.name ?? '产品详情' },
    ],
    [categoryLabel, categoryParam, product?.name]
  );

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="加载中..." breadcrumbs={breadcrumbs}>
        <Card>
          <div style={LOADING_STYLE}><Spin size="large" /></div>
        </Card>
      </PageContainer>
    );
  }

  // Error state
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

  // 404 state
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

  // Derive display values from actual product data
  const tagColor = CATEGORY_TAG_COLORS[product.subCategory] ?? 'default';
  const tagLabel = CATEGORY_TAG_LABELS[product.subCategory] ?? product.subCategory;

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: <ProductBasicInfo product={product} />,
    },
    {
      key: 'suppliers',
      label: '供应商',
      children: <ProductSupplierTab productId={productId!} />,
    },
    {
      key: 'pricing',
      label: '定价',
      children: <ProductPricingTab productId={productId!} defaultPrice={product.defaultPrice} />,
    },
  ];

  return (
    <PageContainer
      title={product.name}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Tag color={tagColor}>{tagLabel}</Tag>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/products/${categoryParam}/${productId}/edit`)}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalOpen(true)}
          >
            删除
          </Button>
        </Space>
      }
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除产品 <Text strong>&quot;{product.name}&quot;</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
