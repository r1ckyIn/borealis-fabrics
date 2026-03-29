/**
 * Audit log list page with search, filter, and pagination.
 * Displays audit log entries with 5 filter controls: operator, action, entity type, time range, keyword.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Input, Select, DatePicker, Space, Button } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/layout/PageContainer';
import { useAuditLogs } from '@/hooks/queries/useAuditLogs';
import type { AuditLog, AuditLogQuery } from '@/types';

const { RangePicker } = DatePicker;

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

/** Entity type options for filter. */
const ENTITY_TYPE_OPTIONS = [
  { value: 'Supplier', label: '供应商' },
  { value: 'Customer', label: '客户' },
  { value: 'Fabric', label: '面料' },
  { value: 'Product', label: '产品' },
  { value: 'Order', label: '订单' },
  { value: 'Quote', label: '报价' },
];

/** Entity type label mapping. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Supplier: '供应商',
  Customer: '客户',
  Fabric: '面料',
  Product: '产品',
  Order: '订单',
  Quote: '报价',
};

/** Action type options for filter. */
const ACTION_OPTIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'restore', label: '恢复' },
];

/**
 * Audit log list page component.
 * Route: /audit
 */
export default function AuditLogPage(): React.ReactElement {
  const navigate = useNavigate();

  // Filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [operatorKeyword, setOperatorKeyword] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [entityType, setEntityType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [keyword, setKeyword] = useState<string | undefined>();

  // Build query params
  const queryParams = useMemo<AuditLogQuery>(() => {
    const params: AuditLogQuery = { page, pageSize };
    if (action) params.action = action;
    if (entityType) params.entityType = entityType;
    // Operator name filter takes priority over general keyword (both map to backend keyword param)
    const effectiveKeyword = operatorKeyword || keyword;
    if (effectiveKeyword) params.keyword = effectiveKeyword;
    if (dateRange) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    return params;
  }, [page, pageSize, operatorKeyword, action, entityType, dateRange, keyword]);

  const { data, isLoading } = useAuditLogs(queryParams);

  /** Handle pagination change. */
  const handleTableChange = useCallback(
    (pagination: { current?: number; pageSize?: number }) => {
      setPage(pagination.current ?? 1);
      setPageSize(pagination.pageSize ?? 20);
    },
    []
  );

  /** Reset all filters. */
  const handleReset = useCallback(() => {
    setOperatorKeyword(undefined);
    setAction(undefined);
    setEntityType(undefined);
    setDateRange(null);
    setKeyword(undefined);
    setPage(1);
  }, []);

  // Table columns
  const columns: ColumnsType<AuditLog> = useMemo(
    () => [
      {
        title: '操作时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作人',
        dataIndex: 'userName',
        key: 'userName',
        width: 120,
      },
      {
        title: '操作类型',
        dataIndex: 'action',
        key: 'action',
        width: 100,
        render: (val: string) => (
          <Tag color={ACTION_TAG_COLORS[val] ?? 'default'}>
            {ACTION_LABELS[val] ?? val}
          </Tag>
        ),
      },
      {
        title: '实体类型',
        dataIndex: 'entityType',
        key: 'entityType',
        width: 100,
        render: (val: string) => ENTITY_TYPE_LABELS[val] ?? val,
      },
      {
        title: '实体ID',
        dataIndex: 'entityId',
        key: 'entityId',
        width: 80,
        align: 'right',
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/audit/${record.id}`)}
          >
            详情
          </Button>
        ),
      },
    ],
    [navigate]
  );

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '审计日志' },
  ];

  return (
    <PageContainer title="审计日志" breadcrumbs={breadcrumbs}>
      {/* Filter bar */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="操作人"
            allowClear
            value={operatorKeyword}
            onChange={(e) => {
              setOperatorKeyword(e.target.value || undefined);
              setPage(1);
            }}
            style={{ width: 150 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="操作类型"
            allowClear
            value={action}
            onChange={(val) => {
              setAction(val);
              setPage(1);
            }}
            options={ACTION_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            placeholder="实体类型"
            allowClear
            value={entityType}
            onChange={(val) => {
              setEntityType(val);
              setPage(1);
            }}
            options={ENTITY_TYPE_OPTIONS}
            style={{ width: 120 }}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
              setPage(1);
            }}
          />
          <Input.Search
            placeholder="关键字搜索"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value || undefined)}
            onSearch={() => setPage(1)}
            style={{ width: 200 }}
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* Data Table */}
      <Card>
        <Table<AuditLog>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.pagination.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  );
}
