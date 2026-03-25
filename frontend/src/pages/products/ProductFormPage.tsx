/**
 * Product form page placeholder.
 * Will be implemented in Phase 08 Plan 02.
 */

import { useParams } from 'react-router-dom';
import { Result } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';

export default function ProductFormPage(): React.ReactElement {
  const { id, category } = useParams<{ id: string; category: string }>();
  const isEdit = !!id;

  return (
    <PageContainer title={isEdit ? `编辑产品 #${id}` : '新建产品'}>
      <Result
        status="info"
        title={`产品${isEdit ? '编辑' : '创建'}页 (${category})`}
        subTitle="此页面将在后续计划中实现"
      />
    </PageContainer>
  );
}
