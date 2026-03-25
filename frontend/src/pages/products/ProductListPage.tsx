/**
 * Product list page placeholder.
 * Will be implemented in Phase 08 Plan 02.
 */

import { useParams } from 'react-router-dom';
import { Result } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { PRODUCT_SUB_CATEGORY_LABELS } from '@/types';
import { CATEGORY_ROUTE_MAP } from '@/utils/product-constants';

export default function ProductListPage(): React.ReactElement {
  const { category } = useParams<{ category: string }>();
  const subCategory = category ? CATEGORY_ROUTE_MAP[category] : undefined;
  const label = subCategory
    ? PRODUCT_SUB_CATEGORY_LABELS[subCategory as keyof typeof PRODUCT_SUB_CATEGORY_LABELS]
    : category;

  return (
    <PageContainer title={`${label ?? '产品'}管理`}>
      <Result
        status="info"
        title={`${label ?? '产品'}列表页`}
        subTitle="此页面将在后续计划中实现"
      />
    </PageContainer>
  );
}
