/**
 * Quote detail page showing quote header info and QuoteItem table.
 * Supports checkbox selection for partial quote-to-order conversion.
 * Already-converted items show a "converted" tag and disabled checkboxes.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Spin,
  Result,
  Space,
  Tooltip,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';

import { PageContainer } from '@/components/layout/PageContainer';
import { StatusTag } from '@/components/common/StatusTag';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { getDeleteErrorMessage, getErrorMessage } from '@/utils/errorMessages';
import {
  useQuote,
  useDeleteQuote,
  useConvertQuoteItems,
} from '@/hooks/queries/useQuotes';
import { formatDate, parseEntityId } from '@/utils';
import { QuoteStatus, PRODUCT_SUB_CATEGORY_LABELS } from '@/types';
import type { QuoteItem, ApiError } from '@/types';
import type { ProductSubCategory } from '@/types';
import {
  CATEGORY_TAG_COLORS,
  CATEGORY_TAG_LABELS,
} from '@/utils/product-constants';

const { Text } = Typography;

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Quote detail page component.
 * Route: /quotes/:id
 */
export default function QuoteDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quoteId = parseEntityId(id);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Checkbox selection for partial conversion
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Fetch quote data
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: fetchError,
  } = useQuote(quoteId);

  // Mutations
  const deleteMutation = useDeleteQuote();
  const convertMutation = useConvertQuoteItems();

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '报价管理', path: '/quotes' },
      { label: quote?.quoteCode ?? '报价详情' },
    ],
    [quote?.quoteCode]
  );

  /** Navigate back to quote list. */
  const goToList = useCallback(() => navigate('/quotes'), [navigate]);

  /** Handle delete confirmation. */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!quoteId) return;

    try {
      await deleteMutation.mutateAsync(quoteId);
      message.success('报价已删除');
      navigate('/quotes');
    } catch (error: unknown) {
      console.error('Delete error:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '报价单'));
    }
  }, [quoteId, deleteMutation, navigate]);

  /** Handle convert confirmation. */
  const handleConvertConfirm = useCallback(async (): Promise<void> => {
    if (selectedRowKeys.length === 0) return;

    try {
      const order = await convertMutation.mutateAsync({
        quoteItemIds: selectedRowKeys,
      });
      message.success('转化成功');
      setSelectedRowKeys([]);
      setConvertModalOpen(false);
      navigate(`/orders/${order.id}`);
    } catch (error: unknown) {
      console.error('Convert error:', error);
      const apiError = error as ApiError;
      if (apiError.code === 409) {
        message.warning('该报价正在被其他请求转换，请稍后重试');
      } else if (apiError.code === 503) {
        message.warning('系统暂时不可用，请稍后重试');
      } else {
        message.error(getErrorMessage(apiError));
      }
    }
  }, [selectedRowKeys, convertMutation, navigate]);

  // QuoteItem table columns
  const itemColumns: ColumnsType<QuoteItem> = useMemo(
    () => [
      {
        title: '产品',
        key: 'product',
        render: (_, item) => {
          if (item.fabric)
            return `${item.fabric.fabricCode} - ${item.fabric.name}`;
          if (item.product)
            return `${item.product.productCode} - ${item.product.name}`;
          return '-';
        },
      },
      {
        title: '分类',
        key: 'category',
        width: 80,
        render: (_, item) => {
          if (item.fabric) {
            return (
              <Tag color={CATEGORY_TAG_COLORS['fabric']}>
                {CATEGORY_TAG_LABELS['fabric']}
              </Tag>
            );
          }
          if (item.product) {
            const subCat = item.product.subCategory;
            const label =
              PRODUCT_SUB_CATEGORY_LABELS[subCat as ProductSubCategory] ||
              subCat;
            const color = CATEGORY_TAG_COLORS[subCat] || 'default';
            return <Tag color={color}>{label}</Tag>;
          }
          return '-';
        },
      },
      {
        title: '数量',
        key: 'quantity',
        width: 100,
        render: (_, item) => `${Number(item.quantity)} ${item.unit}`,
      },
      {
        title: '单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 120,
        render: (v: number) => `¥${Number(v).toFixed(2)}`,
      },
      {
        title: '小计',
        dataIndex: 'subtotal',
        key: 'subtotal',
        width: 120,
        render: (v: number) => `¥${Number(v).toFixed(2)}`,
      },
      {
        title: '状态',
        key: 'convertStatus',
        width: 100,
        render: (_, item) =>
          item.isConverted ? (
            <Tag color="blue">已转换</Tag>
          ) : (
            <Tag color="green">待转换</Tag>
          ),
      },
      {
        title: '备注',
        dataIndex: 'notes',
        key: 'notes',
        ellipsis: true,
      },
    ],
    []
  );

  // Row selection config — disable checkboxes for already-converted items
  const rowSelection: TableRowSelection<QuoteItem> = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys as number[]),
      getCheckboxProps: (record: QuoteItem) => ({
        disabled: record.isConverted,
      }),
    }),
    [selectedRowKeys]
  );

  // Loading state
  if (isLoadingQuote) {
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
            subTitle="无法加载报价信息，请稍后重试"
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
  if (!quote) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="报价不存在"
            subTitle="您访问的报价不存在或已被删除"
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

  const isActive = quote.status === QuoteStatus.ACTIVE;
  const isPartiallyConverted =
    quote.status === QuoteStatus.PARTIALLY_CONVERTED;
  const isConverted = quote.status === QuoteStatus.CONVERTED;
  const canEdit = !isConverted;
  const canConvert = isActive || isPartiallyConverted;

  return (
    <PageContainer
      title={quote.quoteCode}
      breadcrumbs={breadcrumbs}
      extra={
        <Space>
          <Tooltip title={!canEdit ? '已转换的报价无法编辑' : undefined}>
            <Button
              icon={<EditOutlined />}
              disabled={!canEdit}
              onClick={() => navigate(`/quotes/${quoteId}/edit`)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title={isConverted ? '已转换的报价无法删除' : undefined}>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={isConverted}
              onClick={() => setDeleteModalOpen(true)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      }
    >
      {/* Quote Header Info */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="报价单号">
            <Text strong>{quote.quoteCode}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag type="quote" value={quote.status} />
          </Descriptions.Item>
          <Descriptions.Item label="客户">
            {quote.customer ? (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/customers/${quote.customerId}`)}
              >
                {quote.customer.companyName}
              </Button>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="总金额">
            <AmountDisplay value={quote.totalPrice} />
          </Descriptions.Item>
          <Descriptions.Item label="有效期至">
            {formatDate(quote.validUntil)}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(quote.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>
            {quote.notes ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Quote Items Table */}
      <Card
        title={`报价明细 (${quote.items?.length ?? 0} 项)`}
      >
        <Table<QuoteItem>
          columns={itemColumns}
          dataSource={quote.items ?? []}
          rowKey="id"
          pagination={false}
          rowSelection={canConvert ? rowSelection : undefined}
          size="middle"
        />

        {/* Conversion Action */}
        {canConvert && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              disabled={selectedRowKeys.length === 0}
              loading={convertMutation.isPending}
              onClick={() => setConvertModalOpen(true)}
            >
              转化为订单 ({selectedRowKeys.length} 项)
            </Button>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除报价 <Text strong>&quot;{quote.quoteCode}&quot;</Text> 吗？
            <br />
            <Text type="secondary">此操作不可恢复</Text>
          </>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
        confirmText="删除"
        danger
        loading={deleteMutation.isPending}
      />

      {/* Convert Confirmation Modal */}
      <ConfirmModal
        open={convertModalOpen}
        title="确认转化"
        content={`确定将选中的 ${selectedRowKeys.length} 项报价明细转化为订单吗？`}
        onConfirm={handleConvertConfirm}
        onCancel={() => setConvertModalOpen(false)}
        confirmText="确认转化"
        loading={convertMutation.isPending}
      />
    </PageContainer>
  );
}
