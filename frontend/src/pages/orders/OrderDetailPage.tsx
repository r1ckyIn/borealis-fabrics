/**
 * Order detail page showing all order information.
 * Contains tabs: Items, Timeline, Customer Payment, Supplier Payments, Logistics.
 * Supports status changes, cancellation, restoration, item CRUD, and payment editing.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Button,
  Space,
  Spin,
  Result,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Dropdown,
  Popconfirm,
  message,
  Typography,
  Empty,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DownOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { OrderTimeline } from '@/components/business/OrderTimeline';
import { OrderStatusFlow } from '@/components/business/OrderStatusFlow';
import { PaymentStatusCard } from '@/components/business/PaymentStatusCard';
import { FabricSelector } from '@/components/business/FabricSelector';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import { LogisticsForm } from '@/components/forms/LogisticsForm';
import {
  useOrder,
  useOrderItems,
  useOrderTimeline,
  useSupplierPayments,
  useDeleteOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useUpdateOrderItemStatus,
  useCancelOrderItem,
  useRestoreOrderItem,
  useUpdateCustomerPayment,
  useUpdateSupplierPayment,
} from '@/hooks/queries/useOrders';
import {
  useCreateLogistics,
  useUpdateLogistics,
  useDeleteLogistics,
} from '@/hooks/queries/useLogistics';
import { getFabrics } from '@/api/fabric.api';
import { getSuppliers } from '@/api/supplier.api';
import {
  formatDate,
  formatQuantity,
  parseEntityId,
  getValidNextStatuses,
  getStatusLabel,
  canModifyItem,
  canDeleteItem,
  canCancelItem,
  canRestoreItem,
  calculateAggregateStatus,
} from '@/utils';
import {
  OrderItemStatus,
  CustomerPayStatus,
  CUSTOMER_PAY_STATUS_LABELS,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '@/types';
import type {
  OrderItem,
  Logistics,
  SupplierPayment,
  AddOrderItemData,
  UpdateOrderItemData,
  CreateLogisticsData,
  UpdateLogisticsData,
  UpdateCustomerPaymentData,
  UpdateSupplierPaymentData,
} from '@/types';

const { Text } = Typography;
const { TextArea } = Input;

const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

interface LogisticsModalState {
  open: boolean;
  mode: 'create' | 'edit';
  logistics: Logistics | null;
  orderItemId: number | null;
}

const LOGISTICS_MODAL_CLOSED: LogisticsModalState = {
  open: false,
  mode: 'create',
  logistics: null,
  orderItemId: null,
};

/** Search helpers for selectors. */
async function searchFabrics(keyword: string) {
  const result = await getFabrics({ keyword, pageSize: 20 });
  return result.items;
}
async function searchSuppliers(keyword: string) {
  const result = await getSuppliers({ keyword, pageSize: 20 });
  return result.items;
}

/** Customer pay status select options. */
const PAY_STATUS_OPTIONS = Object.values(CustomerPayStatus).map((value) => ({
  label: CUSTOMER_PAY_STATUS_LABELS[value],
  value,
}));

/** Payment method select options. */
const PAY_METHOD_OPTIONS = Object.values(PaymentMethod).map((value) => ({
  label: PAYMENT_METHOD_LABELS[value],
  value,
}));

// =============================================================================
// Main Component
// =============================================================================

export default function OrderDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = parseEntityId(id);

  // Tab state
  const [activeTab, setActiveTab] = useState('items');

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    item: OrderItem | null;
    targetStatus: OrderItemStatus | null;
  }>({ open: false, item: null, targetStatus: null });
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    item: OrderItem | null;
  }>({ open: false, item: null });
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean;
    item: OrderItem | null;
  }>({ open: false, item: null });
  const [addItemModal, setAddItemModal] = useState(false);
  const [editItemModal, setEditItemModal] = useState<{
    open: boolean;
    item: OrderItem | null;
  }>({ open: false, item: null });
  const [customerPayModal, setCustomerPayModal] = useState(false);
  const [supplierPayModal, setSupplierPayModal] = useState<{
    open: boolean;
    payment: SupplierPayment | null;
  }>({ open: false, payment: null });
  const [logisticsModal, setLogisticsModal] = useState(LOGISTICS_MODAL_CLOSED);

  // Forms
  const [statusForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [addItemForm] = Form.useForm();
  const [editItemForm] = Form.useForm();
  const [customerPayForm] = Form.useForm();
  const [supplierPayForm] = Form.useForm();

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

  // Order mutations
  const deleteMutation = useDeleteOrder();
  const addItemMutation = useAddOrderItem();
  const updateItemMutation = useUpdateOrderItem();
  const deleteItemMutation = useDeleteOrderItem();
  const updateStatusMutation = useUpdateOrderItemStatus();
  const cancelItemMutation = useCancelOrderItem();
  const restoreItemMutation = useRestoreOrderItem();
  const updateCustomerPayMutation = useUpdateCustomerPayment();
  const updateSupplierPayMutation = useUpdateSupplierPayment();

  // Logistics mutations
  const createLogisticsMutation = useCreateLogistics();
  const updateLogisticsMutation = useUpdateLogistics();
  const deleteLogisticsMutation = useDeleteLogistics();

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

  // =============================================================================
  // Aggregate status from items
  // =============================================================================

  const aggregateStatus = useMemo(() => {
    if (!orderItems || orderItems.length === 0) {
      return order?.status ?? OrderItemStatus.INQUIRY;
    }
    return calculateAggregateStatus(
      orderItems.map((item) => item.status)
    );
  }, [orderItems, order?.status]);

  // =============================================================================
  // Order Delete
  // =============================================================================

  const handleDeleteOrder = useCallback(async (): Promise<void> => {
    if (!orderId) return;
    try {
      await deleteMutation.mutateAsync(orderId);
      message.success('订单已删除');
      navigate('/orders');
    } catch {
      message.error('删除失败，请重试');
    }
  }, [orderId, deleteMutation, navigate]);

  // =============================================================================
  // Status Change Handlers
  // =============================================================================

  const openStatusModal = useCallback(
    (item: OrderItem, targetStatus: OrderItemStatus) => {
      statusForm.resetFields();
      setStatusModal({ open: true, item, targetStatus });
    },
    [statusForm]
  );

  const handleStatusChange = useCallback(async (): Promise<void> => {
    if (!orderId || !statusModal.item || !statusModal.targetStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        itemId: statusModal.item.id,
        data: { status: statusModal.targetStatus },
      });
      message.success(`状态已更新为「${getStatusLabel(statusModal.targetStatus)}」`);
      setStatusModal({ open: false, item: null, targetStatus: null });
    } catch {
      message.error('状态更新失败，请重试');
    }
  }, [orderId, statusModal, updateStatusMutation]);

  // =============================================================================
  // Cancel / Restore Handlers
  // =============================================================================

  const openCancelModal = useCallback(
    (item: OrderItem) => {
      cancelForm.resetFields();
      setCancelModal({ open: true, item });
    },
    [cancelForm]
  );

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!orderId || !cancelModal.item) return;
    try {
      const values = await cancelForm.validateFields();
      await cancelItemMutation.mutateAsync({
        orderId,
        itemId: cancelModal.item.id,
        data: values.reason ? { reason: values.reason } : undefined,
      });
      message.success('订单明细已取消');
      setCancelModal({ open: false, item: null });
    } catch {
      message.error('取消失败，请重试');
    }
  }, [orderId, cancelModal, cancelForm, cancelItemMutation]);

  const openRestoreModal = useCallback(
    (item: OrderItem) => {
      setRestoreModal({ open: true, item });
    },
    []
  );

  const handleRestore = useCallback(async (): Promise<void> => {
    if (!orderId || !restoreModal.item) return;
    try {
      await restoreItemMutation.mutateAsync({
        orderId,
        itemId: restoreModal.item.id,
      });
      message.success('订单明细已恢复');
      setRestoreModal({ open: false, item: null });
    } catch {
      message.error('恢复失败，请重试');
    }
  }, [orderId, restoreModal, restoreItemMutation]);

  // =============================================================================
  // Add / Edit / Delete Item Handlers
  // =============================================================================

  const openAddItem = useCallback(() => {
    addItemForm.resetFields();
    setAddItemModal(true);
  }, [addItemForm]);

  const handleAddItem = useCallback(async (): Promise<void> => {
    if (!orderId) return;
    try {
      const values = await addItemForm.validateFields();
      const data: AddOrderItemData = {
        fabricId: values.fabricId,
        supplierId: values.supplierId,
        quantity: values.quantity,
        salePrice: values.salePrice,
        purchasePrice: values.purchasePrice,
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      await addItemMutation.mutateAsync({ orderId, data });
      message.success('明细已添加');
      setAddItemModal(false);
    } catch {
      message.error('添加失败，请重试');
    }
  }, [orderId, addItemForm, addItemMutation]);

  const openEditItem = useCallback(
    (item: OrderItem) => {
      editItemForm.setFieldsValue({
        fabricId: item.fabricId,
        supplierId: item.supplierId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        deliveryDate: item.deliveryDate ? dayjs(item.deliveryDate) : undefined,
        notes: item.notes ?? undefined,
      });
      setEditItemModal({ open: true, item });
    },
    [editItemForm]
  );

  const handleEditItem = useCallback(async (): Promise<void> => {
    if (!orderId || !editItemModal.item) return;
    try {
      const values = await editItemForm.validateFields();
      const data: UpdateOrderItemData = {
        supplierId: values.supplierId,
        quantity: values.quantity,
        salePrice: values.salePrice,
        purchasePrice: values.purchasePrice,
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      await updateItemMutation.mutateAsync({
        orderId,
        itemId: editItemModal.item.id,
        data,
      });
      message.success('明细已更新');
      setEditItemModal({ open: false, item: null });
    } catch {
      message.error('更新失败，请重试');
    }
  }, [orderId, editItemModal, editItemForm, updateItemMutation]);

  const handleDeleteItem = useCallback(
    async (itemId: number): Promise<void> => {
      if (!orderId) return;
      try {
        await deleteItemMutation.mutateAsync({ orderId, itemId });
        message.success('明细已删除');
      } catch {
        message.error('删除失败，请重试');
      }
    },
    [orderId, deleteItemMutation]
  );

  // =============================================================================
  // Customer Payment Handler
  // =============================================================================

  const openCustomerPayModal = useCallback(() => {
    if (!order) return;
    customerPayForm.setFieldsValue({
      customerPaid: order.customerPaid,
      customerPayStatus: order.customerPayStatus,
      customerPayMethod: order.customerPayMethod ?? undefined,
      customerPaidAt: order.customerPaidAt ? dayjs(order.customerPaidAt) : undefined,
    });
    setCustomerPayModal(true);
  }, [order, customerPayForm]);

  const handleCustomerPaySubmit = useCallback(async (): Promise<void> => {
    if (!orderId) return;
    try {
      const values = await customerPayForm.validateFields();
      const data: UpdateCustomerPaymentData = {
        customerPaid: values.customerPaid,
        customerPayStatus: values.customerPayStatus,
        customerPayMethod: values.customerPayMethod,
        customerPaidAt: values.customerPaidAt?.toISOString(),
      };
      await updateCustomerPayMutation.mutateAsync({ orderId, data });
      message.success('客户付款信息已更新');
      setCustomerPayModal(false);
    } catch {
      message.error('更新失败，请重试');
    }
  }, [orderId, customerPayForm, updateCustomerPayMutation]);

  // =============================================================================
  // Supplier Payment Handler
  // =============================================================================

  const openSupplierPayModal = useCallback(
    (payment: SupplierPayment) => {
      supplierPayForm.setFieldsValue({
        paid: payment.paid,
        payStatus: payment.payStatus,
        payMethod: payment.payMethod ?? undefined,
        paidAt: payment.paidAt ? dayjs(payment.paidAt) : undefined,
      });
      setSupplierPayModal({ open: true, payment });
    },
    [supplierPayForm]
  );

  const handleSupplierPaySubmit = useCallback(async (): Promise<void> => {
    if (!orderId || !supplierPayModal.payment) return;
    try {
      const values = await supplierPayForm.validateFields();
      const data: UpdateSupplierPaymentData = {
        paid: values.paid,
        payStatus: values.payStatus,
        payMethod: values.payMethod,
        paidAt: values.paidAt?.toISOString(),
      };
      await updateSupplierPayMutation.mutateAsync({
        orderId,
        supplierId: supplierPayModal.payment.supplierId,
        data,
      });
      message.success('供应商付款信息已更新');
      setSupplierPayModal({ open: false, payment: null });
    } catch {
      message.error('更新失败，请重试');
    }
  }, [orderId, supplierPayModal, supplierPayForm, updateSupplierPayMutation]);

  // =============================================================================
  // Logistics Handlers
  // =============================================================================

  const openAddLogistics = useCallback((orderItemId: number) => {
    setLogisticsModal({
      open: true,
      mode: 'create',
      logistics: null,
      orderItemId,
    });
  }, []);

  const openEditLogistics = useCallback((logistics: Logistics) => {
    setLogisticsModal({
      open: true,
      mode: 'edit',
      logistics,
      orderItemId: logistics.orderItemId,
    });
  }, []);

  const handleLogisticsSubmit = useCallback(
    async (data: CreateLogisticsData | UpdateLogisticsData): Promise<void> => {
      try {
        if (logisticsModal.mode === 'create') {
          await createLogisticsMutation.mutateAsync(data as CreateLogisticsData);
          message.success('物流信息已添加');
        } else if (logisticsModal.logistics) {
          await updateLogisticsMutation.mutateAsync({
            id: logisticsModal.logistics.id,
            data: data as UpdateLogisticsData,
          });
          message.success('物流信息已更新');
        }
        setLogisticsModal(LOGISTICS_MODAL_CLOSED);
      } catch {
        message.error('操作失败，请重试');
      }
    },
    [logisticsModal, createLogisticsMutation, updateLogisticsMutation]
  );

  const handleDeleteLogistics = useCallback(
    async (logisticsId: number): Promise<void> => {
      try {
        await deleteLogisticsMutation.mutateAsync(logisticsId);
        message.success('物流信息已删除');
      } catch {
        message.error('删除失败，请重试');
      }
    },
    [deleteLogisticsMutation]
  );

  // =============================================================================
  // Items Table Columns
  // =============================================================================

  const itemColumns: ColumnsType<OrderItem> = useMemo(
    () => [
      {
        title: '面料',
        key: 'fabric',
        width: 180,
        render: (_, record) =>
          record.fabric ? (
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => navigate(`/fabrics/${record.fabricId}`)}
            >
              {record.fabric.fabricCode} - {record.fabric.name}
            </Button>
          ) : (
            '-'
          ),
      },
      {
        title: '供应商',
        key: 'supplier',
        width: 120,
        render: (_, record) => record.supplier?.companyName ?? '-',
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        align: 'right',
        render: (qty: number) => formatQuantity(qty),
      },
      {
        title: '销售单价',
        dataIndex: 'salePrice',
        key: 'salePrice',
        width: 110,
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '采购单价',
        dataIndex: 'purchasePrice',
        key: 'purchasePrice',
        width: 110,
        align: 'right',
        render: (price: number | null) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '小计',
        dataIndex: 'subtotal',
        key: 'subtotal',
        width: 120,
        align: 'right',
        render: (total: number) => (
          <Text strong>
            <AmountDisplay value={total} />
          </Text>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: OrderItemStatus) => (
          <StatusTag type="orderItem" value={status} />
        ),
      },
      {
        title: '交货日期',
        dataIndex: 'deliveryDate',
        key: 'deliveryDate',
        width: 110,
        render: (date: string | null) => (date ? formatDate(date) : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        fixed: 'right',
        render: (_, record) => {
          const validNext = getValidNextStatuses(record.status).filter(
            (s) => s !== OrderItemStatus.CANCELLED
          );
          const showCancel = canCancelItem(record.status);
          const showRestore = canRestoreItem(
            record.status,
            (record.prevStatus as OrderItemStatus) ?? null
          );
          const showEdit = canModifyItem(record.status);
          const showDelete = canDeleteItem(record.status);

          const statusMenuItems = validNext.map((status) => ({
            key: status,
            label: `推进到「${getStatusLabel(status)}」`,
            onClick: () => openStatusModal(record, status),
          }));

          return (
            <Space size="small" wrap>
              {statusMenuItems.length > 0 && (
                <Dropdown menu={{ items: statusMenuItems }}>
                  <Button type="link" size="small">
                    推进状态 <DownOutlined />
                  </Button>
                </Dropdown>
              )}
              {showCancel && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => openCancelModal(record)}
                >
                  取消
                </Button>
              )}
              {showRestore && (
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => openRestoreModal(record)}
                >
                  恢复
                </Button>
              )}
              {showEdit && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditItem(record)}
                >
                  编辑
                </Button>
              )}
              {showDelete && (
                <Popconfirm
                  title="确定要删除此明细吗？"
                  onConfirm={() => handleDeleteItem(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => openAddLogistics(record.id)}
              >
                物流
              </Button>
            </Space>
          );
        },
      },
    ],
    [
      navigate,
      openStatusModal,
      openCancelModal,
      openRestoreModal,
      openEditItem,
      handleDeleteItem,
      openAddLogistics,
    ]
  );

  // =============================================================================
  // Logistics Table Columns
  // =============================================================================

  const allLogistics = useMemo(() => {
    if (!orderItems) return [];
    return orderItems.flatMap((item) =>
      (item.logistics ?? []).map((l) => ({
        ...l,
        _fabricCode: item.fabric?.fabricCode ?? '',
      }))
    );
  }, [orderItems]);

  const logisticsColumns: ColumnsType<Logistics & { _fabricCode?: string }> = useMemo(
    () => [
      {
        title: '面料',
        key: 'fabric',
        width: 120,
        render: (_, record) => (record as { _fabricCode?: string })._fabricCode || '-',
      },
      {
        title: '物流公司',
        dataIndex: 'carrier',
        key: 'carrier',
        width: 120,
      },
      {
        title: '联系人',
        dataIndex: 'contactName',
        key: 'contactName',
        width: 100,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '联系电话',
        dataIndex: 'contactPhone',
        key: 'contactPhone',
        width: 120,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '物流单号',
        dataIndex: 'trackingNo',
        key: 'trackingNo',
        width: 140,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '发货日期',
        dataIndex: 'shippedAt',
        key: 'shippedAt',
        width: 110,
        render: (date: string | null) => (date ? formatDate(date) : '-'),
      },
      {
        title: '备注',
        dataIndex: 'notes',
        key: 'notes',
        width: 140,
        ellipsis: true,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditLogistics(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除此物流信息吗？"
              onConfirm={() => handleDeleteLogistics(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openEditLogistics, handleDeleteLogistics]
  );

  // =============================================================================
  // Loading & Error States
  // =============================================================================

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

  // =============================================================================
  // Items Summary
  // =============================================================================

  const itemsSummary = () => {
    if (!orderItems || orderItems.length === 0) return null;
    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={5} align="right">
          <Text strong>合计</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <Text strong>
            <AmountDisplay value={total} />
          </Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} colSpan={3} />
      </Table.Summary.Row>
    );
  };

  // =============================================================================
  // Tab Items
  // =============================================================================

  const tabItems = [
    {
      key: 'items',
      label: `订单明细 (${orderItems?.length ?? 0})`,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddItem}
            >
              添加明细
            </Button>
          </div>
          <Table<OrderItem>
            columns={itemColumns}
            dataSource={orderItems ?? []}
            rowKey="id"
            loading={isLoadingItems}
            pagination={false}
            scroll={{ x: 1200 }}
            size="middle"
            summary={itemsSummary}
          />
        </div>
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
        <PaymentStatusCard
          type="customer"
          totalAmount={order.totalAmount}
          paidAmount={order.customerPaid}
          payStatus={order.customerPayStatus}
          payMethod={order.customerPayMethod}
          paidAt={order.customerPaidAt}
          onEdit={openCustomerPayModal}
        />
      ),
    },
    {
      key: 'supplierPayments',
      label: `供应商付款 (${supplierPayments?.length ?? 0})`,
      children: isLoadingSupplierPayments ? (
        <div style={LOADING_STYLE}>
          <Spin />
        </div>
      ) : supplierPayments && supplierPayments.length > 0 ? (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {supplierPayments.map((payment) => (
            <PaymentStatusCard
              key={payment.supplierId}
              type="supplier"
              totalAmount={payment.payable}
              paidAmount={payment.paid}
              payStatus={payment.payStatus}
              payMethod={payment.payMethod}
              paidAt={payment.paidAt}
              supplierName={payment.supplier?.companyName}
              onEdit={() => openSupplierPayModal(payment)}
            />
          ))}
        </Space>
      ) : (
        <Empty description="暂无供应商付款信息" />
      ),
    },
    {
      key: 'logistics',
      label: `物流信息 (${allLogistics.length})`,
      children: (
        <Table
          columns={logisticsColumns}
          dataSource={allLogistics}
          rowKey="id"
          loading={isLoadingItems}
          pagination={false}
          scroll={{ x: 1000 }}
          size="middle"
        />
      ),
    },
  ];

  // =============================================================================
  // Render
  // =============================================================================

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
      {/* Order Header */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="订单号">
            <Text strong>{order.orderCode}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="客户">
            {order.customer ? (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/customers/${order.customerId}`)}
              >
                {order.customer.companyName}
              </Button>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="聚合状态">
            <StatusTag type="orderItem" value={aggregateStatus} />
          </Descriptions.Item>
          <Descriptions.Item label="合计金额">
            <AmountDisplay value={order.totalAmount} />
          </Descriptions.Item>
          <Descriptions.Item label="付款状态">
            <StatusTag type="customerPay" value={order.customerPayStatus} />
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(order.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(order.updatedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="交货地址" span={2}>
            {order.deliveryAddress ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>
            {order.notes ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* Status Flow Visualization */}
        <div style={{ marginTop: 16 }}>
          <OrderStatusFlow currentStatus={aggregateStatus} size="small" />
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* ================================================================ */}
      {/* Modals                                                           */}
      {/* ================================================================ */}

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

      {/* Status Change Modal */}
      <Modal
        open={statusModal.open}
        title="确认状态变更"
        onOk={handleStatusChange}
        onCancel={() => setStatusModal({ open: false, item: null, targetStatus: null })}
        confirmLoading={updateStatusMutation.isPending}
      >
        <p>
          确定要将明细状态推进到
          <Text strong>
            「{statusModal.targetStatus ? getStatusLabel(statusModal.targetStatus) : ''}」
          </Text>
          吗？
        </p>
        <Form form={statusForm} layout="vertical">
          <Form.Item name="remark" label="备注（可选）">
            <TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel Item Modal */}
      <Modal
        open={cancelModal.open}
        title="确认取消"
        onOk={handleCancel}
        onCancel={() => setCancelModal({ open: false, item: null })}
        confirmLoading={cancelItemMutation.isPending}
        okButtonProps={{ danger: true }}
        okText="确认取消"
      >
        <p>确定要取消此订单明细吗？取消后可恢复到之前的状态。</p>
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="取消原因（可选）">
            <TextArea rows={2} placeholder="请输入取消原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Restore Item Modal */}
      <ConfirmModal
        open={restoreModal.open}
        title="确认恢复"
        content={
          <>
            确定要恢复此订单明细吗？
            {restoreModal.item?.prevStatus && (
              <>
                <br />
                <Text type="secondary">
                  将恢复到「{getStatusLabel(restoreModal.item.prevStatus as OrderItemStatus)}」状态
                </Text>
              </>
            )}
          </>
        }
        onConfirm={handleRestore}
        onCancel={() => setRestoreModal({ open: false, item: null })}
        confirmText="确认恢复"
        loading={restoreItemMutation.isPending}
      />

      {/* Add Item Modal */}
      <Modal
        open={addItemModal}
        title="添加订单明细"
        onOk={handleAddItem}
        onCancel={() => setAddItemModal(false)}
        confirmLoading={addItemMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={addItemForm} layout="vertical">
          <Form.Item
            name="fabricId"
            label="面料"
            rules={[{ required: true, message: '请选择面料' }]}
          >
            <FabricSelector onSearch={searchFabrics} placeholder="请选择面料" />
          </Form.Item>
          <Form.Item name="supplierId" label="供应商">
            <SupplierSelector
              onSearch={searchSuppliers}
              placeholder="请选择供应商（可选）"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入数量"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              addonAfter="米"
            />
          </Form.Item>
          <Form.Item
            name="salePrice"
            label="销售单价"
            rules={[
              { required: true, message: '请输入销售单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入销售单价"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item name="purchasePrice" label="采购单价">
            <InputNumber
              placeholder="采购价（可选）"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item name="deliveryDate" label="交货日期">
            <DatePicker style={{ width: '100%' }} placeholder="请选择交货日期" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        open={editItemModal.open}
        title="编辑订单明细"
        onOk={handleEditItem}
        onCancel={() => setEditItemModal({ open: false, item: null })}
        confirmLoading={updateItemMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={editItemForm} layout="vertical">
          <Form.Item name="fabricId" label="面料">
            <FabricSelector
              onSearch={searchFabrics}
              placeholder="请选择面料"
              disabled
            />
          </Form.Item>
          <Form.Item name="supplierId" label="供应商">
            <SupplierSelector
              onSearch={searchSuppliers}
              placeholder="请选择供应商（可选）"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入数量"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              addonAfter="米"
            />
          </Form.Item>
          <Form.Item
            name="salePrice"
            label="销售单价"
            rules={[
              { required: true, message: '请输入销售单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber
              placeholder="请输入销售单价"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item name="purchasePrice" label="采购单价">
            <InputNumber
              placeholder="采购价（可选）"
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item name="deliveryDate" label="交货日期">
            <DatePicker style={{ width: '100%' }} placeholder="请选择交货日期" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Customer Payment Edit Modal */}
      <Modal
        open={customerPayModal}
        title="编辑客户付款信息"
        onOk={handleCustomerPaySubmit}
        onCancel={() => setCustomerPayModal(false)}
        confirmLoading={updateCustomerPayMutation.isPending}
        destroyOnClose
      >
        <Form form={customerPayForm} layout="vertical">
          <Form.Item
            name="customerPaid"
            label="已付金额"
            rules={[{ required: true, message: '请输入已付金额' }]}
          >
            <InputNumber
              placeholder="请输入已付金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item
            name="customerPayStatus"
            label="付款状态"
            rules={[{ required: true, message: '请选择付款状态' }]}
          >
            <Select options={PAY_STATUS_OPTIONS} placeholder="请选择付款状态" />
          </Form.Item>
          <Form.Item name="customerPayMethod" label="付款方式">
            <Select
              options={PAY_METHOD_OPTIONS}
              placeholder="请选择付款方式"
              allowClear
            />
          </Form.Item>
          <Form.Item name="customerPaidAt" label="付款时间">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择付款时间"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Supplier Payment Edit Modal */}
      <Modal
        open={supplierPayModal.open}
        title={`编辑供应商付款 - ${supplierPayModal.payment?.supplier?.companyName ?? ''}`}
        onOk={handleSupplierPaySubmit}
        onCancel={() => setSupplierPayModal({ open: false, payment: null })}
        confirmLoading={updateSupplierPayMutation.isPending}
        destroyOnClose
      >
        <Form form={supplierPayForm} layout="vertical">
          <Form.Item
            name="paid"
            label="已付金额"
            rules={[{ required: true, message: '请输入已付金额' }]}
          >
            <InputNumber
              placeholder="请输入已付金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item
            name="payStatus"
            label="付款状态"
            rules={[{ required: true, message: '请选择付款状态' }]}
          >
            <Select options={PAY_STATUS_OPTIONS} placeholder="请选择付款状态" />
          </Form.Item>
          <Form.Item name="payMethod" label="付款方式">
            <Select
              options={PAY_METHOD_OPTIONS}
              placeholder="请选择付款方式"
              allowClear
            />
          </Form.Item>
          <Form.Item name="paidAt" label="付款时间">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择付款时间"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Logistics Form Modal */}
      <LogisticsForm
        open={logisticsModal.open}
        mode={logisticsModal.mode}
        initialValues={logisticsModal.logistics}
        orderItemId={logisticsModal.orderItemId ?? undefined}
        onSubmit={handleLogisticsSubmit}
        onCancel={() => setLogisticsModal(LOGISTICS_MODAL_CLOSED)}
        loading={
          createLogisticsMutation.isPending || updateLogisticsMutation.isPending
        }
      />
    </PageContainer>
  );
}
