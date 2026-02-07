/**
 * PricingTable - Displays pricing details for order/quote items.
 * Shows fabric info, prices, quantities, subtotals, and optional profit margins.
 */

import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { formatCurrency, formatQuantity, formatPercent } from '@/utils/format';

const { Text } = Typography;

export interface PricingItem {
  id: number;
  fabricCode?: string;
  fabricName?: string;
  salePrice: number;
  purchasePrice?: number | null;
  quantity: number;
  subtotal: number;
}

export interface PricingTableProps {
  items: PricingItem[];
  showPurchasePrice?: boolean;
  showProfitMargin?: boolean;
  loading?: boolean;
  showSummary?: boolean;
}

export function PricingTable({
  items,
  showPurchasePrice = false,
  showProfitMargin = false,
  loading = false,
  showSummary = true,
}: PricingTableProps) {
  const columns: ColumnsType<PricingItem> = [
    {
      title: '面料编号',
      dataIndex: 'fabricCode',
      key: 'fabricCode',
      render: (code: string | undefined) => code ?? '-',
    },
    {
      title: '面料名称',
      dataIndex: 'fabricName',
      key: 'fabricName',
      render: (name: string | undefined) => name ?? '-',
    },
    {
      title: '售价',
      dataIndex: 'salePrice',
      key: 'salePrice',
      align: 'right',
      render: (price: number) => formatCurrency(price),
    },
  ];

  if (showPurchasePrice) {
    columns.push({
      title: '采购价',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      align: 'right',
      render: (price: number | null | undefined) => formatCurrency(price),
    });
  }

  columns.push(
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (qty: number) => formatQuantity(qty),
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      render: (amount: number) => (
        <Text strong>{formatCurrency(amount)}</Text>
      ),
    }
  );

  if (showProfitMargin) {
    columns.push({
      title: '利润率',
      key: 'profitMargin',
      align: 'right',
      render: (_: unknown, record: PricingItem) => {
        if (
          record.purchasePrice == null ||
          record.purchasePrice === 0 ||
          record.salePrice === 0
        ) {
          return '-';
        }
        const margin =
          (record.salePrice - record.purchasePrice) / record.salePrice;
        return formatPercent(margin);
      },
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Table<PricingItem>
      columns={columns}
      dataSource={items}
      rowKey="id"
      loading={loading}
      pagination={false}
      size="small"
      summary={
        showSummary
          ? () => (
              <Table.Summary.Row>
                <Table.Summary.Cell
                  index={0}
                  colSpan={columns.length - 1}
                  align="right"
                >
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong type="danger">
                    {formatCurrency(totalAmount)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          : undefined
      }
    />
  );
}
