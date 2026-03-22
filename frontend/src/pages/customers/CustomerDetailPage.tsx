/**
 * Customer detail page showing all customer information.
 * Contains 4 tabs: Basic Info, Addresses, Pricing Rules, and Order History.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Button,
  Spin,
  Result,
  Table,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Empty,
  List,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/layout/PageContainer';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FabricSelector } from '@/components/business/FabricSelector';
import {
  useCustomer,
  useCustomerPricing,
  useCustomerOrders,
  useCreateCustomerPricing,
  useUpdateCustomerPricing,
  useDeleteCustomerPricing,
  useDeleteCustomer,
} from '@/hooks/queries/useCustomers';
import { fabricApi } from '@/api';
import { formatDate, parseEntityId } from '@/utils';
import { getDeleteErrorMessage } from '@/utils/errorMessages';
import type { ApiError } from '@/types';
import {
  CreditType,
  CREDIT_TYPE_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  CUSTOMER_PAY_STATUS_LABELS,
} from '@/types';
import type {
  CustomerPricing,
  Order,
  Address,
  Fabric,
  OrderItemStatus,
  CustomerPayStatus,
} from '@/types';

const { Text } = Typography;

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/** Map payment status to tag color. */
const PAY_STATUS_COLORS: Record<CustomerPayStatus, string> = {
  paid: 'green',
  partial: 'orange',
  unpaid: 'default',
};

/** Pricing form values type. */
interface PricingFormValues {
  fabricId: number;
  specialPrice: number;
}

/**
 * Customer detail page component.
 * Route: /customers/:id
 */
export default function CustomerDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = parseEntityId(id);

  // Tab state
  const [activeTab, setActiveTab] = useState('info');
  const [deleteCustomerModalOpen, setDeleteCustomerModalOpen] = useState(false);

  // Delete customer mutation
  const deleteCustomerMutation = useDeleteCustomer();

  const handleDeleteCustomer = useCallback(async (): Promise<void> => {
    if (!customerId) return;
    try {
      await deleteCustomerMutation.mutateAsync(customerId);
      message.success('客户已删除');
      navigate('/customers');
    } catch (error) {
      console.error('Delete customer failed:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '客户'));
    }
  }, [customerId, deleteCustomerMutation, navigate]);

  // Pricing modal state
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CustomerPricing | null>(null);
  const [pricingForm] = Form.useForm<PricingFormValues>();

  // Delete pricing confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pricingToDelete, setPricingToDelete] = useState<CustomerPricing | null>(null);

  // Fetch customer data
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: fetchError,
  } = useCustomer(customerId);

  // Fetch pricing when tab is active
  const { data: pricingData, isLoading: isLoadingPricing } = useCustomerPricing(
    customerId,
    activeTab === 'pricing'
  );

  // Fetch orders when tab is active
  const { data: ordersData, isLoading: isLoadingOrders } = useCustomerOrders(
    customerId,
    undefined,
    activeTab === 'orders'
  );

  // Pricing mutations
  const createPricingMutation = useCreateCustomerPricing();
  const updatePricingMutation = useUpdateCustomerPricing();
  const deletePricingMutation = useDeleteCustomerPricing();

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '客户管理', path: '/customers' },
      { label: customer?.companyName ?? '客户详情' },
    ],
    [customer?.companyName]
  );

  /** Navigate back to customer list. */
  const goToList = useCallback(() => navigate('/customers'), [navigate]);

  /** Navigate to order detail page. */
  const goToOrderDetail = useCallback(
    (orderId: number) => navigate(`/orders/${orderId}`),
    [navigate]
  );

  /** Navigate to fabric detail page. */
  const goToFabricDetail = useCallback(
    (fabricId: number) => navigate(`/fabrics/${fabricId}`),
    [navigate]
  );

  /** Search fabrics for FabricSelector. */
  const searchFabrics = useCallback(
    async (keyword: string): Promise<Fabric[]> => {
      const result = await fabricApi.getFabrics({ keyword, page: 1, pageSize: 20 });
      return result.items;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Pricing Modal Handlers
  // ---------------------------------------------------------------------------

  /** Open pricing modal for creating. */
  const openCreatePricingModal = useCallback((): void => {
    setEditingPricing(null);
    pricingForm.resetFields();
    setPricingModalOpen(true);
  }, [pricingForm]);

  /** Open pricing modal for editing. */
  const openEditPricingModal = useCallback(
    (pricing: CustomerPricing): void => {
      setEditingPricing(pricing);
      pricingForm.setFieldsValue({
        fabricId: pricing.fabricId,
        specialPrice: pricing.specialPrice,
      });
      setPricingModalOpen(true);
    },
    [pricingForm]
  );

  /** Close pricing modal. */
  const closePricingModal = useCallback((): void => {
    setPricingModalOpen(false);
    setEditingPricing(null);
    pricingForm.resetFields();
  }, [pricingForm]);

  /** Handle pricing form submission. */
  const handlePricingSubmit = useCallback(async (): Promise<void> => {
    if (!customerId) return;

    try {
      const values = await pricingForm.validateFields();

      if (editingPricing) {
        await updatePricingMutation.mutateAsync({
          customerId,
          pricingId: editingPricing.id,
          data: { specialPrice: values.specialPrice },
        });
        message.success('特殊定价更新成功');
      } else {
        await createPricingMutation.mutateAsync({
          customerId,
          data: {
            fabricId: values.fabricId,
            specialPrice: values.specialPrice,
          },
        });
        message.success('特殊定价创建成功');
      }
      closePricingModal();
    } catch (error) {
      console.error('Pricing submit error:', error);
      message.error(editingPricing ? '更新失败，请重试' : '创建失败，请重试');
    }
  }, [
    customerId,
    pricingForm,
    editingPricing,
    createPricingMutation,
    updatePricingMutation,
    closePricingModal,
  ]);

  // ---------------------------------------------------------------------------
  // Delete Pricing Handlers
  // ---------------------------------------------------------------------------

  /** Open delete confirmation modal. */
  const openDeletePricingModal = useCallback((pricing: CustomerPricing): void => {
    setPricingToDelete(pricing);
    setDeleteModalOpen(true);
  }, []);

  /** Close delete modal. */
  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setPricingToDelete(null);
  }, []);

  /** Handle delete confirmation. */
  const handleDeletePricingConfirm = useCallback(async (): Promise<void> => {
    if (!customerId || !pricingToDelete) return;

    try {
      await deletePricingMutation.mutateAsync({
        customerId,
        pricingId: pricingToDelete.id,
      });
      message.success('特殊定价已删除');
      closeDeleteModal();
    } catch (error) {
      console.error('Delete pricing error:', error);
      message.error('删除失败，请重试');
    }
  }, [customerId, pricingToDelete, deletePricingMutation, closeDeleteModal]);

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------

  // Pricing table columns
  const pricingColumns: ColumnsType<CustomerPricing> = useMemo(
    () => [
      {
        title: '面料编码',
        key: 'fabricCode',
        width: 140,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => goToFabricDetail(record.fabricId)}
            style={{ padding: 0 }}
          >
            {record.fabric?.fabricCode ?? '-'}
          </Button>
        ),
      },
      {
        title: '面料名称',
        key: 'fabricName',
        width: 180,
        ellipsis: true,
        render: (_, record) => record.fabric?.name ?? '-',
      },
      {
        title: '特殊价格',
        dataIndex: 'specialPrice',
        key: 'specialPrice',
        width: 120,
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditPricingModal(record)}
            >
              编辑
            </Button>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => openDeletePricingModal(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [goToFabricDetail, openEditPricingModal, openDeletePricingModal]
  );

  // Orders table columns
  const orderColumns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderCode',
        key: 'orderCode',
        width: 160,
        render: (code: string, record) => (
          <Button
            type="link"
            size="small"
            onClick={() => goToOrderDetail(record.id)}
            style={{ padding: 0 }}
          >
            {code}
          </Button>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: OrderItemStatus) => (
          <Tag>{ORDER_ITEM_STATUS_LABELS[status]}</Tag>
        ),
      },
      {
        title: '总金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right',
        render: (amount: number) => <AmountDisplay value={amount} />,
      },
      {
        title: '付款状态',
        dataIndex: 'customerPayStatus',
        key: 'customerPayStatus',
        width: 100,
        render: (status: CustomerPayStatus) => (
          <Tag color={PAY_STATUS_COLORS[status]}>
            {CUSTOMER_PAY_STATUS_LABELS[status]}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (date: string) => formatDate(date),
      },
    ],
    [goToOrderDetail]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Loading state
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

  // Error state
  if (fetchError) {
    return (
      <PageContainer title="错误" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载客户信息，请稍后重试"
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
  if (!customer) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="客户不存在"
            subTitle="您访问的客户不存在或已被删除"
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

  // Format address for display
  const formatAddress = (address: Address): string => {
    return `${address.province}${address.city}${address.district}${address.detailAddress}`;
  };

  // Tab content
  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="公司名称">
            <Text strong>{customer.companyName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="联系人">
            {customer.contactName ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            {customer.phone ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="微信">
            {customer.wechat ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {customer.email ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="结算方式">
            {CREDIT_TYPE_LABELS[customer.creditType]}
          </Descriptions.Item>
          <Descriptions.Item label="账期天数">
            {customer.creditType === CreditType.CREDIT && customer.creditDays !== null
              ? `${customer.creditDays} 天`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {customer.notes ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(customer.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(customer.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'addresses',
      label: '收货地址',
      children: (
        <>
          {(!customer.addresses || customer.addresses.length === 0) ? (
            <Empty description="暂无收货地址" />
          ) : (
            <List
              dataSource={customer.addresses}
              renderItem={(address, index) => (
                <List.Item
                  className="rounded-lg border border-gray-200 mb-2 p-4"
                  key={index}
                >
                  <List.Item.Meta
                    avatar={<EnvironmentOutlined className="text-2xl text-blue-500" />}
                    title={
                      <Space>
                        <span>
                          {address.contactName} {address.contactPhone}
                        </span>
                        {address.label && <Tag color="blue">{address.label}</Tag>}
                        {address.isDefault && (
                          <Tag color="gold" icon={<StarFilled />}>
                            默认
                          </Tag>
                        )}
                      </Space>
                    }
                    description={formatAddress(address)}
                  />
                </List.Item>
              )}
            />
          )}
        </>
      ),
    },
    {
      key: 'pricing',
      label: '特殊定价',
      children: (
        <>
          <div className="mb-4">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreatePricingModal}
            >
              添加定价
            </Button>
          </div>
          <Table<CustomerPricing>
            columns={pricingColumns}
            dataSource={pricingData ?? []}
            rowKey="id"
            loading={isLoadingPricing}
            pagination={false}
            size="middle"
            locale={{ emptyText: '暂无特殊定价' }}
          />
        </>
      ),
    },
    {
      key: 'orders',
      label: '订单历史',
      children: (
        <Table<Order>
          columns={orderColumns}
          dataSource={ordersData?.items ?? []}
          rowKey="id"
          loading={isLoadingOrders}
          pagination={false}
          size="middle"
          locale={{ emptyText: '暂无订单记录' }}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={customer.companyName}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/customers/${customerId}/edit`)}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteCustomerModalOpen(true)}
          >
            删除
          </Button>
        </Space>
      }
    >
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Pricing Modal */}
      <Modal
        title={editingPricing ? '编辑特殊定价' : '添加特殊定价'}
        open={pricingModalOpen}
        onOk={handlePricingSubmit}
        onCancel={closePricingModal}
        okText="保存"
        cancelText="取消"
        confirmLoading={createPricingMutation.isPending || updatePricingMutation.isPending}
        width={500}
      >
        <Form form={pricingForm} layout="vertical" className="mt-4">
          <Form.Item
            name="fabricId"
            label="面料"
            rules={[{ required: true, message: '请选择面料' }]}
          >
            <FabricSelector
              onSearch={searchFabrics}
              disabled={!!editingPricing}
              placeholder="请搜索并选择面料"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="specialPrice"
            label="特殊价格"
            rules={[
              { required: true, message: '请输入特殊价格' },
              {
                type: 'number',
                min: 0,
                message: '价格不能为负数',
              },
            ]}
          >
            <InputNumber
              placeholder="请输入特殊价格"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              addonAfter="元/米"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除面料{' '}
            <Text strong>"{pricingToDelete?.fabric?.fabricCode}"</Text> 的特殊定价吗？
          </>
        }
        onConfirm={handleDeletePricingConfirm}
        onCancel={closeDeleteModal}
        confirmText="删除"
        danger
        loading={deletePricingMutation.isPending}
      />

      <ConfirmModal
        open={deleteCustomerModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除客户 <Text strong>"{customer.companyName}"</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={handleDeleteCustomer}
        onCancel={() => setDeleteCustomerModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteCustomerMutation.isPending}
      />
    </PageContainer>
  );
}
