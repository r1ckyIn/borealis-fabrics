/**
 * Order detail page - orchestrator component.
 * Delegates rendering to sub-components: OrderInfoSection, OrderItemsSection,
 * OrderPaymentSection, and OrderLogisticsSection.
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
  Typography,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { OrderTimeline } from '@/components/business/OrderTimeline';
import {
  useOrder,
  useOrderItems,
  useOrderTimeline,
  useSupplierPayments,
  useDeleteOrder,
} from '@/hooks/queries/useOrders';
import { parseEntityId, calculateAggregateStatus } from '@/utils';
import { getDeleteErrorMessage } from '@/utils/errorMessages';
import { OrderItemStatus } from '@/types';
import type { ApiError } from '@/types';

import { OrderInfoSection } from './components/OrderInfoSection';
import { OrderItemsSection } from './components/OrderItemsSection';
import {
  CustomerPaymentTab,
  SupplierPaymentsTab,
} from './components/OrderPaymentSection';
import { OrderLogisticsSection } from './components/OrderLogisticsSection';

const { Text } = Typography;
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

export default function OrderDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = parseEntityId(id);

  const [activeTab, setActiveTab] = useState('items');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Fetch data
  const {
    data: order,
    isLoading: isLoadingOrder,
    error: fetchError,
  } = useOrder(orderId);

  const { data: orderItems, isLoading: isLoadingItems } = useOrderItems(
    orderId,
    activeTab === 'items' || activeTab === 'logistics'
  );

  const { data: timeline, isLoading: isLoadingTimeline } = useOrderTimeline(
    orderId,
    activeTab === 'timeline'
  );

  const { data: supplierPayments, isLoading: isLoadingSupplierPayments } =
    useSupplierPayments(orderId, activeTab === 'supplierPayments');

  const deleteMutation = useDeleteOrder();

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '订单管理', path: '/orders' },
      { label: order?.orderCode ?? '订单详情' },
    ],
    [order?.orderCode]
  );

  const goToList = useCallback(() => navigate('/orders'), [navigate]);

  // Aggregate status from items
  const aggregateStatus = useMemo(() => {
    if (!orderItems || orderItems.length === 0) {
      return order?.status ?? OrderItemStatus.INQUIRY;
    }
    return calculateAggregateStatus(
      orderItems.map((item) => item.status)
    );
  }, [orderItems, order?.status]);

  // Delete order handler
  const handleDeleteOrder = useCallback(async (): Promise<void> => {
    if (!orderId) return;
    try {
      await deleteMutation.mutateAsync(orderId);
      message.success('订单已删除');
      navigate('/orders');
    } catch (error) {
      console.error('Delete order failed:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '订单'));
    }
  }, [orderId, deleteMutation, navigate]);

  // Loading state
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

  // Error state
  if (fetchError) {
    return (
      <PageContainer title="错误" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载订单信息，请稍后重试"
            extra={
              <Button type="primary" onClick={goToList}>
                返回列表
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Not found state
  if (!order) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="订单不存在"
            subTitle="您访问的订单不存在或已被删除"
            extra={
              <Button type="primary" onClick={goToList}>
                返回列表
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Tab items
  const tabItems = [
    {
      key: 'items',
      label: `订单明细 (${orderItems?.length ?? 0})`,
      children: (
        <OrderItemsSection
          orderId={orderId!}
          orderItems={orderItems}
          isLoading={isLoadingItems}
          navigate={navigate}
        />
      ),
    },
    {
      key: 'timeline',
      label: '时间线',
      children: (
        <OrderTimeline
          entries={timeline ?? []}
          loading={isLoadingTimeline}
          showItemInfo
        />
      ),
    },
    {
      key: 'customerPayment',
      label: '客户付款',
      children: (
        <CustomerPaymentTab orderId={orderId!} order={order} />
      ),
    },
    {
      key: 'supplierPayments',
      label: `供应商付款 (${supplierPayments?.length ?? 0})`,
      children: (
        <SupplierPaymentsTab
          orderId={orderId!}
          supplierPayments={supplierPayments}
          isLoading={isLoadingSupplierPayments}
        />
      ),
    },
    {
      key: 'logistics',
      label: `物流信息 (${orderItems?.flatMap((i) => i.logistics ?? []).length ?? 0})`,
      children: (
        <OrderLogisticsSection
          orderItems={orderItems}
          isLoading={isLoadingItems}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={order.orderCode}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/orders/${orderId}/edit`)}
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
      {/* Order Header Info */}
      <OrderInfoSection
        order={order}
        aggregateStatus={aggregateStatus}
        navigate={navigate}
      />

      {/* Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* Delete Order Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除订单 <Text strong>"{order.orderCode}"</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={handleDeleteOrder}
        onCancel={() => setDeleteModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
