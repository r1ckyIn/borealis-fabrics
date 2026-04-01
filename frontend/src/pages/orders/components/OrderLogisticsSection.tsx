/**
 * Order logistics tab: logistics table with CRUD operations.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { LogisticsForm } from '@/components/forms/LogisticsForm';
import {
  useCreateLogistics,
  useUpdateLogistics,
  useDeleteLogistics,
} from '@/hooks/queries/useLogistics';
import { formatDate } from '@/utils';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';
import type {
  OrderItem,
  Logistics,
  CreateLogisticsData,
  UpdateLogisticsData,
  ApiError,
} from '@/types';

/** Logistics row with extra fields from the parent order item. */
interface LogisticsRow extends Logistics {
  _fabricCode: string;
  _orderItemId: number;
}

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

export interface OrderLogisticsSectionProps {
  orderItems: OrderItem[] | undefined;
  isLoading: boolean;
}

export function OrderLogisticsSection({
  orderItems,
  isLoading,
}: OrderLogisticsSectionProps): React.ReactElement {
  const [logisticsModal, setLogisticsModal] = useState(LOGISTICS_MODAL_CLOSED);

  const createMutation = useCreateLogistics();
  const updateMutation = useUpdateLogistics();
  const deleteMutation = useDeleteLogistics();

  const openEdit = useCallback((logistics: Logistics) => {
    setLogisticsModal({
      open: true,
      mode: 'edit',
      logistics,
      orderItemId: logistics.orderItemId,
    });
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateLogisticsData | UpdateLogisticsData): Promise<void> => {
      try {
        if (logisticsModal.mode === 'create') {
          await createMutation.mutateAsync(data as CreateLogisticsData);
          message.success('物流信息已添加');
        } else if (logisticsModal.logistics) {
          await updateMutation.mutateAsync({
            id: logisticsModal.logistics.id,
            data: data as UpdateLogisticsData,
          });
          message.success('物流信息已更新');
        }
        setLogisticsModal(LOGISTICS_MODAL_CLOSED);
      } catch (error) {
        logger.error('Logistics operation failed', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [logisticsModal, createMutation, updateMutation]
  );

  const handleDelete = useCallback(
    async (logisticsId: number): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(logisticsId);
        message.success('物流信息已删除');
      } catch (error) {
        logger.error('Delete logistics failed', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [deleteMutation]
  );

  // Flatten logistics from all order items
  const allLogistics: LogisticsRow[] = useMemo(() => {
    if (!orderItems) return [];
    return orderItems.flatMap((item) =>
      (item.logistics ?? []).map((l) => ({
        ...l,
        _fabricCode: item.fabric?.fabricCode ?? '',
        _orderItemId: item.id,
      }))
    );
  }, [orderItems]);

  const columns: ColumnsType<LogisticsRow> = useMemo(
    () => [
      {
        title: '面料',
        key: 'fabric',
        width: 120,
        render: (_, record) => record._fabricCode || '-',
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
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除此物流信息吗？"
              onConfirm={() => handleDelete(record.id)}
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
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                setLogisticsModal({
                  open: true,
                  mode: 'create',
                  logistics: null,
                  orderItemId: record._orderItemId,
                })
              }
            >
              新增
            </Button>
          </Space>
        ),
      },
    ],
    [openEdit, handleDelete]
  );

  return (
    <>
      <Table
        columns={columns}
        dataSource={allLogistics}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1000 }}
        size="middle"
      />

      <LogisticsForm
        open={logisticsModal.open}
        mode={logisticsModal.mode}
        initialValues={logisticsModal.logistics}
        orderItemId={logisticsModal.orderItemId ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => setLogisticsModal(LOGISTICS_MODAL_CLOSED)}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
