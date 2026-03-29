/**
 * Audit log detail page showing field-level change comparison.
 *
 * Displays header info via Descriptions component and changes via Table.
 * Different display modes for create/update/delete/restore actions.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Result, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { useAuditLogDetail } from '@/hooks/queries/useAuditLogs';

const { Text } = Typography;

/** Action type label mapping. */
const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  restore: '恢复',
};

/** Action type Tag color mapping. */
const ACTION_TAG_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  restore: 'orange',
};

/** Entity type label mapping. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Supplier: '供应商',
  Customer: '客户',
  Fabric: '面料',
  Product: '产品',
  Order: '订单',
  Quote: '报价',
};

/** Format a value for display in the changes table. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'string') {
    // Try to format as date if it looks like an ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  }
  if (typeof value === 'number') return String(value);
  // Complex objects: stringify
  return JSON.stringify(value);
}

/** Row type for update changes table (old/new). */
interface UpdateChangeRow {
  key: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/** Row type for flat changes table (create/delete). */
interface FlatChangeRow {
  key: string;
  field: string;
  value: string;
}

/**
 * Audit log detail page component.
 * Route: /audit/:id
 */
export default function AuditLogDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const { data: auditLog, isLoading, error } = useAuditLogDetail(auditId);

  // Parse changes into table rows based on action type
  const updateRows = useMemo<UpdateChangeRow[]>(() => {
    if (!auditLog || auditLog.action !== 'update') return [];
    return Object.entries(auditLog.changes).map(([field, value]) => {
      const change = value as { old?: unknown; new?: unknown } | undefined;
      return {
        key: field,
        field,
        oldValue: formatValue(change?.old),
        newValue: formatValue(change?.new),
      };
    });
  }, [auditLog]);

  const flatRows = useMemo<FlatChangeRow[]>(() => {
    if (!auditLog || auditLog.action === 'update') return [];
    return Object.entries(auditLog.changes).map(([field, value]) => ({
      key: field,
      field,
      value: formatValue(value),
    }));
  }, [auditLog]);

  // Update columns: field, old value, new value
  const updateColumns: ColumnsType<UpdateChangeRow> = [
    { title: '字段名', dataIndex: 'field', key: 'field', width: 200 },
    {
      title: '旧值',
      dataIndex: 'oldValue',
      key: 'oldValue',
      render: (val: string) => <Text type="secondary">{val}</Text>,
    },
    {
      title: '新值',
      dataIndex: 'newValue',
      key: 'newValue',
      render: (val: string) => <Text strong>{val}</Text>,
    },
  ];

  // Flat columns: field, value (for create/delete/restore)
  const flatColumns: ColumnsType<FlatChangeRow> = [
    { title: '字段名', dataIndex: 'field', key: 'field', width: 200 },
    { title: '值', dataIndex: 'value', key: 'value' },
  ];

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '审计日志', path: '/audit' },
    { label: '审计详情' },
  ];

  if (isLoading) {
    return (
      <PageContainer title="审计详情" breadcrumbs={breadcrumbs}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (error || !auditLog) {
    return (
      <PageContainer title="审计详情" breadcrumbs={breadcrumbs}>
        <Result
          status="error"
          title="加载失败"
          subTitle="无法加载审计日志详情"
          extra={
            <Button type="primary" onClick={() => navigate('/audit')}>
              返回列表
            </Button>
          }
        />
      </PageContainer>
    );
  }

  /** Section title for changes based on action type. */
  const changesSectionTitle =
    auditLog.action === 'delete'
      ? '删除前数据'
      : auditLog.action === 'create'
        ? '创建数据'
        : auditLog.action === 'restore'
          ? '恢复数据'
          : '变更对比';

  return (
    <PageContainer
      title="审计详情"
      breadcrumbs={breadcrumbs}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/audit')}
        >
          返回列表
        </Button>
      }
    >
      {/* Header section */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="操作人">{auditLog.userName}</Descriptions.Item>
          <Descriptions.Item label="操作类型">
            <Tag color={ACTION_TAG_COLORS[auditLog.action] ?? 'default'}>
              {ACTION_LABELS[auditLog.action] ?? auditLog.action}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="实体类型">
            {ENTITY_TYPE_LABELS[auditLog.entityType] ?? auditLog.entityType}
          </Descriptions.Item>
          <Descriptions.Item label="实体ID">{auditLog.entityId}</Descriptions.Item>
          <Descriptions.Item label="IP地址">{auditLog.ip}</Descriptions.Item>
          <Descriptions.Item label="关联ID">
            <Text copyable style={{ fontSize: 12 }}>
              {auditLog.correlationId}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="操作时间" span={2}>
            {dayjs(auditLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Changes section */}
      <Card title={changesSectionTitle}>
        {auditLog.action === 'update' ? (
          <Table<UpdateChangeRow>
            columns={updateColumns}
            dataSource={updateRows}
            pagination={false}
            size="small"
          />
        ) : (
          <Table<FlatChangeRow>
            columns={flatColumns}
            dataSource={flatRows}
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </PageContainer>
  );
}
