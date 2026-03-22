/**
 * Order items tab: table with CRUD, status change, cancel/restore operations.
 * Includes all item-related modals.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Dropdown,
  Popconfirm,
  message,
  Typography,
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
import type { NavigateFunction } from 'react-router-dom';
import dayjs from 'dayjs';

import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FabricSelector } from '@/components/business/FabricSelector';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import {
  useAddOrderItem,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useUpdateOrderItemStatus,
  useCancelOrderItem,
  useRestoreOrderItem,
} from '@/hooks/queries/useOrders';
import { getFabrics } from '@/api/fabric.api';
import { getSuppliers } from '@/api/supplier.api';
import {
  formatDate,
  formatQuantity,
  getValidNextStatuses,
  getStatusLabel,
  canModifyItem,
  canDeleteItem,
  canCancelItem,
  canRestoreItem,
} from '@/utils';
import { getErrorMessage } from '@/utils/errorMessages';
import { OrderItemStatus } from '@/types';
import type {
  OrderItem,
  AddOrderItemData,
  UpdateOrderItemData,
  ApiError,
} from '@/types';

const { Text } = Typography;

async function searchFabrics(keyword: string) {
  const result = await getFabrics({ keyword, pageSize: 20 });
  return result.items;
}

async function searchSuppliers(keyword: string) {
  const result = await getSuppliers({ keyword, pageSize: 20 });
  return result.items;
}

export interface OrderItemsSectionProps {
  orderId: number;
  orderItems: OrderItem[] | undefined;
  isLoading: boolean;
  navigate: NavigateFunction;
}

export function OrderItemsSection({
  orderId,
  orderItems,
  isLoading,
  navigate,
}: OrderItemsSectionProps): React.ReactElement {
  // Modal states
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

  // Forms
  const [statusForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [addItemForm] = Form.useForm();
  const [editItemForm] = Form.useForm();

  // Mutations
  const addItemMutation = useAddOrderItem();
  const updateItemMutation = useUpdateOrderItem();
  const deleteItemMutation = useDeleteOrderItem();
  const updateStatusMutation = useUpdateOrderItemStatus();
  const cancelItemMutation = useCancelOrderItem();
  const restoreItemMutation = useRestoreOrderItem();

  // Status change
  const openStatusModal = useCallback(
    (item: OrderItem, targetStatus: OrderItemStatus) => {
      statusForm.resetFields();
      setStatusModal({ open: true, item, targetStatus });
    },
    [statusForm]
  );

  const handleStatusChange = useCallback(async (): Promise<void> => {
    if (!statusModal.item || !statusModal.targetStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        itemId: statusModal.item.id,
        data: { status: statusModal.targetStatus },
      });
      message.success(`状态已更新为「${getStatusLabel(statusModal.targetStatus)}」`);
      setStatusModal({ open: false, item: null, targetStatus: null });
    } catch (error) {
      console.error('Status change failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, statusModal, updateStatusMutation]);

  // Cancel / Restore
  const openCancelModal = useCallback(
    (item: OrderItem) => {
      cancelForm.resetFields();
      setCancelModal({ open: true, item });
    },
    [cancelForm]
  );

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!cancelModal.item) return;
    try {
      const values = await cancelForm.validateFields();
      await cancelItemMutation.mutateAsync({
        orderId,
        itemId: cancelModal.item.id,
        data: values.reason ? { reason: values.reason } : undefined,
      });
      message.success('订单明细已取消');
      setCancelModal({ open: false, item: null });
    } catch (error) {
      console.error('Cancel item failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, cancelModal, cancelForm, cancelItemMutation]);

  const handleRestore = useCallback(async (): Promise<void> => {
    if (!restoreModal.item) return;
    try {
      await restoreItemMutation.mutateAsync({
        orderId,
        itemId: restoreModal.item.id,
      });
      message.success('订单明细已恢复');
      setRestoreModal({ open: false, item: null });
    } catch (error) {
      console.error('Restore item failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, restoreModal, restoreItemMutation]);

  // Add / Edit / Delete item
  const openAddItem = useCallback(() => {
    addItemForm.resetFields();
    setAddItemModal(true);
  }, [addItemForm]);

  const handleAddItem = useCallback(async (): Promise<void> => {
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
    } catch (error) {
      console.error('Add item failed:', error);
      message.error(getErrorMessage(error as ApiError));
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
    if (!editItemModal.item) return;
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
    } catch (error) {
      console.error('Edit item failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, editItemModal, editItemForm, updateItemMutation]);

  const handleDeleteItem = useCallback(
    async (itemId: number): Promise<void> => {
      try {
        await deleteItemMutation.mutateAsync({ orderId, itemId });
        message.success('明细已删除');
      } catch (error) {
        console.error('Delete item failed:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [orderId, deleteItemMutation]
  );

  // Table columns
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
                  onClick={() => setRestoreModal({ open: true, item: record })}
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
            </Space>
          );
        },
      },
    ],
    [
      navigate,
      openStatusModal,
      openCancelModal,
      openEditItem,
      handleDeleteItem,
    ]
  );

  // Items summary row
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

  // Item form fields (shared between add and edit)
  const renderItemFormFields = (isEdit: boolean) => (
    <>
      <Form.Item
        name="fabricId"
        label="面料"
        rules={[{ required: true, message: '请选择面料' }]}
      >
        <FabricSelector
          onSearch={searchFabrics}
          placeholder="请选择面料"
          disabled={isEdit}
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
        <Input.TextArea rows={2} placeholder="请输入备注" />
      </Form.Item>
    </>
  );

  return (
    <>
      {/* Items Table */}
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
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1200 }}
        size="middle"
        summary={itemsSummary}
      />

      {/* Status Change Modal */}
      <Modal
        open={statusModal.open}
        title="确认状态变更"
        onOk={handleStatusChange}
        onCancel={() => setStatusModal({ open: false, item: null, targetStatus: null })}
        confirmLoading={updateStatusMutation.isPending}
        okButtonProps={{ disabled: updateStatusMutation.isPending }}
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
            <Input.TextArea rows={2} placeholder="请输入备注" />
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
        okButtonProps={{ danger: true, disabled: cancelItemMutation.isPending }}
        okText="确认取消"
      >
        <p>确定要取消此订单明细吗？取消后可恢复到之前的状态。</p>
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="取消原因（可选）">
            <Input.TextArea rows={2} placeholder="请输入取消原因" />
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
        okButtonProps={{ disabled: addItemMutation.isPending }}
        width={640}
        destroyOnClose
      >
        <Form form={addItemForm} layout="vertical">
          {renderItemFormFields(false)}
        </Form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        open={editItemModal.open}
        title="编辑订单明细"
        onOk={handleEditItem}
        onCancel={() => setEditItemModal({ open: false, item: null })}
        confirmLoading={updateItemMutation.isPending}
        okButtonProps={{ disabled: updateItemMutation.isPending }}
        width={640}
        destroyOnClose
      >
        <Form form={editItemForm} layout="vertical">
          {renderItemFormFields(true)}
        </Form>
      </Modal>
    </>
  );
}
