/**
 * Order form page for creating and editing orders.
 * Handles both create and edit modes based on URL parameter.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Result, Button } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { OrderForm } from '@/components/forms/OrderForm';
import {
  useOrder,
  useCreateOrder,
  useUpdateOrder,
} from '@/hooks/queries/useOrders';
import type { CreateOrderData, UpdateOrderData, ApiError } from '@/types';
import { parseEntityId } from '@/utils';
import { getErrorMessage, parseFieldError } from '@/utils/errorMessages';

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Order form page component.
 * Route: /orders/new (create) or /orders/:id/edit (edit)
 */
export default function OrderFormPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const orderId = parseEntityId(id);

  // Fetch existing order data for edit mode
  const {
    data: order,
    isLoading: isLoadingOrder,
    error: fetchError,
  } = useOrder(orderId, isEditMode);

  // Mutations
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /** Handle form submission for both create and edit. */
  const handleSubmit = useCallback(
    async (values: CreateOrderData): Promise<void> => {
      try {
        if (isEditMode && orderId) {
          const updateData: UpdateOrderData = {
            deliveryAddress: values.deliveryAddress,
            notes: values.notes,
          };
          await updateMutation.mutateAsync({ id: orderId, data: updateData });
          message.success('订单更新成功');
        } else {
          await createMutation.mutateAsync(values);
          message.success('订单创建成功');
        }
        navigate('/orders');
      } catch (error) {
        console.error('Submit error:', error);
        const apiError = error as ApiError;
        if ((apiError.code === 400 || apiError.code === 422) && apiError.message) {
          const fieldMatch = parseFieldError(apiError.message);
          if (fieldMatch) {
            message.error(fieldMatch.message);
            return;
          }
        }
        message.error(getErrorMessage(apiError));
      }
    },
    [isEditMode, orderId, createMutation, updateMutation, navigate]
  );

  /** Navigate back to order list. */
  const goToList = useCallback((): void => {
    navigate('/orders');
  }, [navigate]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '订单管理', path: '/orders' },
    { label: isEditMode ? '编辑订单' : '新建订单' },
  ];

  // Handle edit mode loading/error states
  if (isEditMode) {
    if (isLoadingOrder) {
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
              subTitle="无法加载订单信息，请稍后重试"
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

    if (!order) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="订单不存在"
              subTitle="您访问的订单不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={isEditMode ? `编辑订单: ${order?.orderCode}` : '新建订单'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <OrderForm
          initialValues={order}
          onSubmit={handleSubmit}
          onCancel={goToList}
          loading={isSubmitting}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Card>
    </PageContainer>
  );
}
