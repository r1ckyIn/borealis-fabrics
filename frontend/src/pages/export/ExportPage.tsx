/**
 * Data export page with entity type selection, field checkboxes, and Excel download.
 *
 * Steps:
 * 1. Select entity type via radio group
 * 2. Select fields via checkbox group (populated from API)
 * 3. Click export button to download Excel file
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, Radio, Checkbox, Button, Space, Typography, Spin, message, Divider } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

import { PageContainer } from '@/components/layout/PageContainer';
import { useExportFields, useDownloadExport } from '@/hooks/queries/useExport';

const { Title, Text } = Typography;

/** Entity type options for selection. */
const ENTITY_TYPE_OPTIONS = [
  { value: 'supplier', label: '供应商' },
  { value: 'customer', label: '客户' },
  { value: 'fabric', label: '面料' },
  { value: 'product', label: '产品' },
  { value: 'order', label: '订单' },
  { value: 'quote', label: '报价' },
];

/**
 * Data export page component.
 * Route: /export
 */
export default function ExportPage(): React.ReactElement {
  // Step 1: Entity type selection
  const [entityType, setEntityType] = useState<string>('');

  // Step 2: Field selection (null = "all fields" default, string[] = user has made choices)
  const [userSelectedFields, setUserSelectedFields] = useState<string[] | null>(null);

  // Fetch field config for selected entity type
  const { data: fieldConfig, isLoading: isLoadingFields } = useExportFields(entityType);

  // Download mutation
  const downloadMutation = useDownloadExport();

  // All field names from config
  const allFieldNames = useMemo(
    () => (fieldConfig ?? []).map((f) => f.field),
    [fieldConfig]
  );

  // Effective selected fields: if user hasn't interacted, default to all fields
  const selectedFields = useMemo(
    () => (userSelectedFields !== null ? userSelectedFields : allFieldNames),
    [userSelectedFields, allFieldNames]
  );

  // Check if all fields are selected
  const isAllSelected = selectedFields.length === allFieldNames.length && allFieldNames.length > 0;
  const isIndeterminate = selectedFields.length > 0 && selectedFields.length < allFieldNames.length;

  /** Handle entity type change. */
  const handleEntityTypeChange = useCallback((value: string) => {
    setEntityType(value);
    setUserSelectedFields(null); // Reset to "all fields" default
  }, []);

  /** Handle select all toggle. */
  const handleSelectAll = useCallback(
    (e: CheckboxChangeEvent) => {
      setUserSelectedFields(e.target.checked ? allFieldNames : []);
    },
    [allFieldNames]
  );

  /** Handle field checkbox changes. */
  const handleFieldChange = useCallback((checkedValues: string[]) => {
    setUserSelectedFields(checkedValues);
  }, []);

  /** Handle export button click. */
  const handleExport = useCallback(() => {
    if (!entityType || selectedFields.length === 0) {
      message.warning('请先选择实体类型和导出字段');
      return;
    }
    downloadMutation.mutate(
      { entityType, fields: selectedFields },
      {
        onSuccess: () => {
          message.success('导出成功');
        },
        onError: () => {
          message.error('导出失败，请重试');
        },
      }
    );
  }, [entityType, selectedFields, downloadMutation]);

  // Breadcrumb configuration
  const breadcrumbs = [
    { label: '首页', path: '/' },
    { label: '数据导出' },
  ];

  return (
    <PageContainer title="数据导出" breadcrumbs={breadcrumbs}>
      {/* Step 1: Entity type selection */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>选择数据类型</Title>
        <Radio.Group
          value={entityType}
          onChange={(e) => handleEntityTypeChange(e.target.value as string)}
          optionType="button"
          buttonStyle="solid"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <Radio.Button key={opt.value} value={opt.value}>
              {opt.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </Card>

      {/* Step 2: Field selection */}
      {entityType && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>选择导出字段</Title>
          {isLoadingFields ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin />
            </div>
          ) : fieldConfig && fieldConfig.length > 0 ? (
            <>
              <Checkbox
                indeterminate={isIndeterminate}
                onChange={handleSelectAll}
                checked={isAllSelected}
              >
                全选 / 取消全选
              </Checkbox>
              <Divider style={{ margin: '12px 0' }} />
              <Checkbox.Group
                value={selectedFields}
                onChange={handleFieldChange as (checkedValue: (string | number | boolean)[]) => void}
              >
                <Space wrap>
                  {fieldConfig.map((field) => (
                    <Checkbox key={field.field} value={field.field}>
                      {field.label}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </>
          ) : (
            <Text type="secondary">暂无可导出字段</Text>
          )}
        </Card>
      )}

      {/* Step 3: Export button */}
      {entityType && (
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={downloadMutation.isPending}
              disabled={selectedFields.length === 0}
            >
              导出 Excel
            </Button>
            <Text type="secondary">
              已选择 {selectedFields.length} 个字段
            </Text>
          </Space>
        </Card>
      )}
    </PageContainer>
  );
}
