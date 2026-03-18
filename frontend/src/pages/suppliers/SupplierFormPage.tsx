/**
 * Supplier form page for creating and editing suppliers.
 * Handles both create and edit modes based on URL parameter.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Spin, message, Result, Button } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { SupplierForm } from '@/components/forms/SupplierForm';
import {
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
} from '@/hooks/queries/useSuppliers';
import type { CreateSupplierData, UpdateSupplierData, ApiError } from '@/types';
import { parseEntityId } from '@/utils';
import { getErrorMessage, parseFieldError } from '@/utils/errorMessages';

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Supplier form page component.
 * Route: /suppliers/new (create) or /suppliers/:id/edit (edit)
 */
export default function SupplierFormPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const supplierId = parseEntityId(id);
  const [form] = Form.useForm<CreateSupplierData>();

  // Fetch existing supplier data for edit mode
  const {
    data: supplier,
    isLoading: isLoadingSupplier,
    error: fetchError,
  } = useSupplier(supplierId, isEditMode);

  // Mutations
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /**
   * Handle form submission for both create and edit.
   * Uses getErrorMessage for Chinese error display and parseFieldError
   * for inline field validation on 400/422 responses.
   */
  const handleSubmit = useCallback(
    async (values: CreateSupplierData): Promise<void> => {
      try {
        if (isEditMode && supplierId) {
          await updateMutation.mutateAsync({
            id: supplierId,
            data: values as UpdateSupplierData,
          });
          message.success('供应商更新成功');
        } else {
          await createMutation.mutateAsync(values);
          message.success('供应商创建成功');
        }
        navigate('/suppliers');
      } catch (error) {
        console.error('Submit error:', error);
        const apiError = error as ApiError;
        // For validation errors, attempt inline field error display
        if ((apiError.code === 400 || apiError.code === 422) && apiError.message) {
          const fieldMatch = parseFieldError(apiError.message);
          if (fieldMatch) {
            form.setFields([
              { name: fieldMatch.field as keyof CreateSupplierData, errors: [fieldMatch.message] },
            ]);
            return;
          }
        }
        message.error(getErrorMessage(apiError));
      }
    },
    [isEditMode, supplierId, createMutation, updateMutation, navigate, form]
  );

  /** Navigate back to supplier list. */
  const goToList = useCallback((): void => {
    navigate('/suppliers');
  }, [navigate]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '供应商管理', path: '/suppliers' },
    { label: isEditMode ? '编辑供应商' : '新建供应商' },
  ];

  // Handle edit mode loading/error states
  if (isEditMode) {
    if (isLoadingSupplier) {
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
              subTitle="无法加载供应商信息，请稍后重试"
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

    if (!supplier) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="供应商不存在"
              subTitle="您访问的供应商不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={isEditMode ? `编辑供应商: ${supplier?.companyName}` : '新建供应商'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <SupplierForm
          form={form}
          initialValues={supplier}
          onSubmit={handleSubmit}
          onCancel={goToList}
          loading={isSubmitting}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Card>
    </PageContainer>
  );
}
