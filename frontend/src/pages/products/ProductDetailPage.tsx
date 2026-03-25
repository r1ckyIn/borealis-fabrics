/**
 * Product detail page placeholder.
 * Will be implemented in Phase 08 Plan 02.
 */

import { useParams } from 'react-router-dom';
import { Result } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';

export default function ProductDetailPage(): React.ReactElement {
  const { id, category } = useParams<{ id: string; category: string }>();

  return (
    <PageContainer title={`产品详情 #${id}`}>
      <Result
        status="info"
        title={`产品详情页 (${category} #${id})`}
        subTitle="此页面将在后续计划中实现"
      />
    </PageContainer>
  );
}
