/**
 * Order items table with columns for fabric, supplier, quantity,
 * pricing, status, delivery date, and row-level actions.
 */

import { useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Dropdown,
  Popconfirm,
  Typography,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { NavigateFunction } from 'react-router-dom';

import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
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
import { OrderItemStatus } from '@/types';
import type { OrderItem } from '@/types';

const { Text } = Typography;

export interface OrderItemTableProps {
  items: OrderItem[] | undefined;
  isLoading: boolean;
  navigate: NavigateFunction;
  onEdit: (item: OrderItem) => void;
  onDelete: (itemId: number) => void;
  isDeleting: boolean;
  onStatusAction: (item: OrderItem, targetStatus: OrderItemStatus) => void;
  onCancel: (item: OrderItem) => void;
  onRestore: (item: OrderItem) => void;
}

export function OrderItemTable({
  items,
  isLoading,
  navigate,
  onEdit,
  onDelete,
  isDeleting,
  onStatusAction,
  onCancel,
  onRestore,
}: OrderItemTableProps): React.ReactElement {
  const columns: ColumnsType<OrderItem> = useMemo(
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
              onClick={() => navigate(`/products/fabrics/${record.fabricId}`)}
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
            onClick: () => onStatusAction(record, status),
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
                  onClick={() => onCancel(record)}
                >
                  取消
                </Button>
              )}
              {showRestore && (
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => onRestore(record)}
                >
                  恢复
                </Button>
              )}
              {showEdit && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                >
                  编辑
                </Button>
              )}
              {showDelete && (
                <Popconfirm
                  title="确定要删除此明细吗？"
                  onConfirm={() => onDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ loading: isDeleting }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    disabled={isDeleting}
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
    [navigate, onEdit, onDelete, isDeleting, onStatusAction, onCancel, onRestore]
  );

  // Summary row showing total amount
  const itemsSummary = useCallback(() => {
    if (!items || items.length === 0) return null;
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
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
  }, [items]);

  return (
    <Table<OrderItem>
      columns={columns}
      dataSource={items ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      scroll={{ x: 1200 }}
      size="middle"
      summary={itemsSummary}
    />
  );
}
