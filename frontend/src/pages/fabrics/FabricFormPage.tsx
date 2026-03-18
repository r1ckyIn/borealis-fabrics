/**
 * Fabric form page for creating and editing fabrics.
 * Handles both create and edit modes based on URL parameter.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Result, Button, Form } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { FabricForm } from '@/components/forms/FabricForm';
import {
  useFabric,
  useCreateFabric,
  useUpdateFabric,
} from '@/hooks/queries/useFabrics';
import { getErrorMessage } from '@/utils/errorMessages';
import type { CreateFabricData, UpdateFabricData, ApiError } from '@/types';
import { parseEntityId } from '@/utils';

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Fabric form page component.
 * Route: /fabrics/new (create) or /fabrics/:id/edit (edit)
 */
export default function FabricFormPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form] = Form.useForm<CreateFabricData>();
  const isEditMode = !!id;
  const fabricId = parseEntityId(id);

  // Fetch existing fabric data for edit mode
  const {
    data: fabric,
    isLoading: isLoadingFabric,
    error: fetchError,
  } = useFabric(fabricId, isEditMode);

  // Mutations
  const createMutation = useCreateFabric();
  const updateMutation = useUpdateFabric();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /**
   * Handle form submission for both create and edit.
   */
  const handleSubmit = useCallback(
    async (values: CreateFabricData): Promise<void> => {
      try {
        if (isEditMode && fabricId) {
          await updateMutation.mutateAsync({
            id: fabricId,
            data: values as UpdateFabricData,
          });
          message.success('面料更新成功');
        } else {
          await createMutation.mutateAsync(values);
          message.success('面料创建成功');
        }
        navigate('/fabrics');
      } catch (error: unknown) {
        console.error('Submit error:', error);
        const apiError = error as ApiError;

        // For 400/422 validation errors, try to set inline field errors
        if (apiError.code === 400 || apiError.code === 422) {
          // If backend returns field-specific message, try to map to form field
          const fieldMap: Record<string, string> = {
            FABRIC_CODE_EXISTS: 'fabricCode',
          };
          const fieldName = fieldMap[apiError.message];
          if (fieldName) {
            form.setFields([
              { name: fieldName as keyof CreateFabricData, errors: [getErrorMessage(apiError)] },
            ]);
            return;
          }
        }

        // Non-field errors: show toast
        message.error(getErrorMessage(apiError));
      }
    },
    [isEditMode, fabricId, createMutation, updateMutation, navigate, form]
  );

  /** Navigate back to fabric list. */
  const goToList = useCallback((): void => {
    navigate('/fabrics');
  }, [navigate]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '面料管理', path: '/fabrics' },
    { label: isEditMode ? '编辑面料' : '新建面料' },
  ];

  // Handle edit mode loading/error states
  if (isEditMode) {
    if (isLoadingFabric) {
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
              subTitle="无法加载面料信息，请稍后重试"
              extra={[
                <Button key="back" onClick={goToList}>返回列表</Button>,
                <Button key="retry" type="primary" onClick={() => window.location.reload()}>
                  重试
                </Button>,
              ]}
            />
          </Card>
        </PageContainer>
      );
    }

    if (!fabric) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="面料不存在"
              subTitle="您访问的面料不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={isEditMode ? `编辑面料: ${fabric?.name}` : '新建面料'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <FabricForm
          form={form}
          initialValues={fabric}
          onSubmit={handleSubmit}
          onCancel={goToList}
          loading={isSubmitting}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Card>
    </PageContainer>
  );
}
