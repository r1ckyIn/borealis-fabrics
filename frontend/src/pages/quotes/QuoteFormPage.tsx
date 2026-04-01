/**
 * Quote form page for creating and editing quotes.
 * Create mode: full multi-item form with UnifiedProductSelector.
 * Edit mode: header-only (validUntil, notes); items managed on detail page.
 */

import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Result, Button, Form } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { QuoteForm } from '@/components/forms/QuoteForm';
import {
  useQuote,
  useCreateQuote,
  useUpdateQuote,
} from '@/hooks/queries/useQuotes';
import { getErrorMessage } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';
import { QuoteStatus } from '@/types';
import type { CreateQuoteData, UpdateQuoteData, ApiError } from '@/types';
import { parseEntityId } from '@/utils';

/** Centered loading spinner style. */
const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

/**
 * Quote form page component.
 * Route: /quotes/new (create) or /quotes/:id/edit (edit)
 */
export default function QuoteFormPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const isEditMode = !!id;
  const quoteId = parseEntityId(id);

  // Fetch existing quote data for edit mode
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: fetchError,
  } = useQuote(quoteId, isEditMode);

  // Mutations
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /** Handle form submission for both create and edit. */
  const handleSubmit = useCallback(
    async (values: CreateQuoteData): Promise<void> => {
      try {
        if (isEditMode && quoteId) {
          // Edit mode: only send header fields (validUntil, notes)
          const updateData: UpdateQuoteData = {
            validUntil: values.validUntil,
            notes: values.notes,
          };
          await updateMutation.mutateAsync({
            id: quoteId,
            data: updateData,
          });
          message.success('报价更新成功');
        } else {
          // Create mode: send full data with items[]
          await createMutation.mutateAsync(values);
          message.success('报价创建成功');
        }
        navigate('/quotes');
      } catch (error: unknown) {
        logger.error('Submit error', error);
        const apiError = error as ApiError;

        // For 400/422 validation errors, try to set inline field errors
        if (apiError.code === 400 || apiError.code === 422) {
          const fieldMap: Record<string, string> = {
            QUOTE_ALREADY_CONVERTED: 'status',
            QUOTE_EXPIRED: 'validUntil',
          };
          const fieldName = fieldMap[apiError.message];
          if (fieldName) {
            form.setFields([
              { name: fieldName, errors: [getErrorMessage(apiError)] },
            ]);
            return;
          }
        }

        // Non-field errors: show toast
        message.error(getErrorMessage(apiError));
      }
    },
    [isEditMode, quoteId, createMutation, updateMutation, navigate, form]
  );

  /** Navigate back to quote list. */
  const goToList = useCallback((): void => {
    navigate('/quotes');
  }, [navigate]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '报价管理', path: '/quotes' },
    { label: isEditMode ? '编辑报价' : '新建报价' },
  ];

  // Handle edit mode loading/error states
  if (isEditMode) {
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

    if (fetchError) {
      return (
        <PageContainer title="错误" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="error"
              title="加载失败"
              subTitle="无法加载报价信息，请稍后重试"
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

    if (!quote) {
      return (
        <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="404"
              title="报价不存在"
              subTitle="您访问的报价不存在或已被删除"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }

    // Prevent editing converted quotes
    if (quote.status === QuoteStatus.CONVERTED) {
      return (
        <PageContainer title="无法编辑" breadcrumbs={breadcrumbs}>
          <Card>
            <Result
              status="warning"
              title="已转换的报价无法编辑"
              subTitle="该报价已转换为订单，无法进行修改"
              extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
            />
          </Card>
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer
      title={isEditMode ? `编辑报价: ${quote?.quoteCode}` : '新建报价'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <QuoteForm
          form={form}
          initialValues={quote}
          onSubmit={handleSubmit}
          onCancel={goToList}
          loading={isSubmitting}
          mode={isEditMode ? 'edit' : 'create'}
        />
      </Card>
    </PageContainer>
  );
}
