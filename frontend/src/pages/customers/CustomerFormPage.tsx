/**
 * Customer form page for creating and editing customers.
 * Handles both create and edit modes based on URL parameter.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Result, Button } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { CustomerForm } from '@/components/forms/CustomerForm';
import {
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
} from '@/hooks/queries/useCustomers';
import type { CreateCustomerData, UpdateCustomerData } from '@/types';

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Customer form page component.
 * Route: /customers/new (create) or /customers/:id/edit (edit)
 */
export default function CustomerFormPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const customerId = id ? parseInt(id, 10) : undefined;

  // Fetch existing customer data for edit mode
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: fetchError,
  } = useCustomer(customerId, isEditMode);

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /**
   * Handle form submission for both create and edit.
   */
  const handleSubmit = useCallback(
    async (values: CreateCustomerData): Promise<void> => {
      try {
        if (isEditMode && customerId) {
          await updateMutation.mutateAsync({
            id: customerId,
            data: values as UpdateCustomerData,
          });
          message.success('客户更新成功');
        } else {
          await createMutation.mutateAsync(values);
          message.success('客户创建成功');
        }
        navigate('/customers');
      } catch (error) {
        // Error is already handled by TanStack Query error handling
        console.error('Submit error:', error);
        message.error(isEditMode ? '更新失败，请重试' : '创建失败，请重试');
      }
    },
    [isEditMode, customerId, createMutation, updateMutation, navigate]
  );

  /** Navigate back to customer list. */
  const goToList = useCallback((): void => {
    navigate('/customers');
  }, [navigate]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '客户管理', path: '/customers' },
    { label: isEditMode ? '编辑客户' : '新建客户' },
  ];

  // Handle edit mode loading/error states
  if (isEditMode) {
    if (isLoadingCustomer) {
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
              subTitle="无法加载客户信息，请稍后重试"
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

    if (!customer) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="客户不存在"
              subTitle="您访问的客户不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={isEditMode ? `编辑客户: ${customer?.companyName}` : '新建客户'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <CustomerForm
          initialValues={customer}
          onSubmit={handleSubmit}
          onCancel={goToList}
          loading={isSubmitting}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Card>
    </PageContainer>
  );
}
