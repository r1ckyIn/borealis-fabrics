/**
 * Quote detail page showing all quote information.
 * Includes action buttons for edit, convert-to-order, and delete.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Spin,
  Result,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons';

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
import { formatDate, formatQuantity, parseEntityId } from '@/utils';
import { QuoteStatus } from '@/types';
import type { ApiError } from '@/types/api.types';

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

  // Fetch quote data
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: fetchError,
  } = useQuote(quoteId);

  // Mutations
  const deleteMutation = useDeleteQuote();
  // TODO(phase-08): Rewrite for multi-item quote conversion
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
    if (!quoteId) return;

    try {
      // TODO(phase-08): Rewrite with item-level selection UI
      const itemIds = (quote?.items ?? []).map((item) => item.id);
      const order = await convertMutation.mutateAsync({ quoteItemIds: itemIds });
      message.success('报价已成功转换为订单');
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
      setConvertModalOpen(false);
    }
  }, [quoteId, convertMutation, navigate]);

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
  const isExpired = quote.status === QuoteStatus.EXPIRED;
  const isConverted = quote.status === QuoteStatus.CONVERTED;
  const canEdit = isActive || isExpired;

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
          {isActive && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setConvertModalOpen(true)}
            >
              转换为订单
            </Button>
          )}
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
      <Card>
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
          {/* TODO(phase-08): Rewrite for multi-item quote model */}
          <Descriptions.Item label="面料编码">
            {(quote as unknown as Record<string, unknown>).fabric ? (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/products/fabrics/${(quote as unknown as Record<string, unknown>).fabricId}`)}
              >
                {((quote as unknown as Record<string, unknown>).fabric as Record<string, string>)?.fabricCode}
              </Button>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="面料名称">
            {((quote as unknown as Record<string, unknown>).fabric as Record<string, string>)?.name ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="数量">
            {formatQuantity((quote as unknown as Record<string, number>).quantity)}
          </Descriptions.Item>
          <Descriptions.Item label="单价">
            <AmountDisplay value={(quote as unknown as Record<string, number>).unitPrice} suffix="/米" />
          </Descriptions.Item>
          <Descriptions.Item label="合计金额">
            <AmountDisplay value={quote.totalPrice} />
          </Descriptions.Item>
          <Descriptions.Item label="有效期至">
            {formatDate(quote.validUntil)}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(quote.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(quote.updatedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>
            {quote.notes ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="确认删除"
        content={
          <>
            确定要删除报价 <Text strong>"{quote.quoteCode}"</Text> 吗？
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
        title="确认转换"
        content={
          <>
            确定要将报价 <Text strong>"{quote.quoteCode}"</Text> 转换为订单吗？
            <br />
            <Text type="secondary">转换后报价状态将变为「已转换」，无法再编辑或删除</Text>
          </>
        }
        onConfirm={handleConvertConfirm}
        onCancel={() => setConvertModalOpen(false)}
        confirmText="确认转换"
        loading={convertMutation.isPending}
      />
    </PageContainer>
  );
}
