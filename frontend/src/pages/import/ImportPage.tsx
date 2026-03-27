/**
 * Excel import page for batch data import.
 * Supports fabric, supplier, purchase order, and sales contract bulk import via Excel files.
 */

import { useState, useCallback, useRef } from 'react';
import { Card, Tabs, Button, Upload, Progress, Space, Typography, Alert, message } from 'antd';
import {
  DownloadOutlined,
  InboxOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { ImportResultModal } from '@/components/business';
import { importApi } from '@/api/import.api';
import { getErrorMessage } from '@/utils/errorMessages';
import type { ApiError, ImportResult } from '@/types';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ImportTab = 'fabric' | 'supplier' | 'purchaseOrder' | 'salesContract';

/** Tabs that use template-based import (have downloadable templates) */
const TEMPLATE_TABS: ImportTab[] = ['fabric', 'supplier'];

interface TabConfig {
  download: () => Promise<void>;
  import: (file: File, onProgress?: (p: number) => void) => Promise<ImportResult>;
}

const TAB_CONFIG: Record<ImportTab, TabConfig> = {
  fabric: {
    download: importApi.downloadFabricTemplate,
    import: importApi.importFabrics,
  },
  supplier: {
    download: importApi.downloadSupplierTemplate,
    import: importApi.importSuppliers,
  },
  purchaseOrder: {
    download: async () => {
      message.info('采购单无需模板，直接上传原始文件');
    },
    import: importApi.importPurchaseOrders,
  },
  salesContract: {
    download: async () => {
      message.info('购销合同无需模板，直接上传原始文件');
    },
    import: importApi.importSalesContracts,
  },
};

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>('fabric');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Track which tab the import was initiated from (MF-7)
  const resultTabRef = useRef<ImportTab>(activeTab);

  const isTemplateBased = TEMPLATE_TABS.includes(activeTab);

  const handleDownloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      await TAB_CONFIG[activeTab].download();
      if (isTemplateBased) {
        message.success('模板下载成功');
      }
    } catch (error) {
      console.error('Template download failed:', error);
      message.error(getErrorMessage(error as ApiError));
    } finally {
      setDownloadingTemplate(false);
    }
  }, [activeTab, isTemplateBased]);

  const handleImport = useCallback(
    async (file: File) => {
      // Capture the active tab at import time (MF-7)
      resultTabRef.current = activeTab;

      setUploading(true);
      setUploadProgress(0);

      try {
        const importResult = await TAB_CONFIG[activeTab].import(file, (percent) => {
          // Cap upload progress at 90% until response arrives (SF-7)
          setUploadProgress(Math.min(percent, 90));
        });

        setUploadProgress(100);
        setResult(importResult);
        setShowResult(true);

        const { successCount, skippedCount: skipped, failureCount } = importResult;
        const skippedInfo = skipped > 0 ? `, ${skipped} 条已存在跳过` : '';

        if (failureCount === 0) {
          message.success(`成功导入 ${successCount} 条记录${skippedInfo}`);
        } else {
          message.warning(
            `导入完成: ${successCount} 成功${skippedInfo}, ${failureCount} 失败`
          );
        }
      } catch (error) {
        console.error('Import failed:', error);
        message.error(getErrorMessage(error as ApiError));
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [activeTab]
  );

  const beforeUpload = useCallback(
    (file: UploadFile) => {
      // Validate file size first (SF-8)
      if (file.size && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        message.error(`文件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
        return Upload.LIST_IGNORE;
      }

      // Validate file type: both MIME type AND extension must match (MF-6)
      const hasXlsxExtension = file.name?.endsWith('.xlsx') ?? false;
      const hasXlsxMime = file.type === ACCEPTED_MIME;
      if (!hasXlsxExtension || !hasXlsxMime) {
        message.error('仅支持 .xlsx 格式的 Excel 文件');
        return Upload.LIST_IGNORE;
      }

      handleImport(file as unknown as File);
      return false;
    },
    [handleImport]
  );

  const renderUploadPanel = (label: string) => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Import prerequisite notice for order-type imports */}
      {(activeTab === 'purchaseOrder' || activeTab === 'salesContract') && (
        <Alert
          type="info"
          message="提示：导入前请确保已导入相关供应商、客户、面料和产品数据"
          showIcon
          style={{ marginBottom: 0 }}
        />
      )}

      <Card size="small">
        <Space direction="vertical" size="small">
          <Text strong>操作说明</Text>
          {isTemplateBased ? (
            <>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                1. 点击下方按钮下载{label}导入模板
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                2. 按照模板格式填写数据（仅支持 .xlsx 格式，最大 {MAX_FILE_SIZE_MB}MB）
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                3. 将填写好的文件拖拽到下方上传区域，或点击选择文件
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                4. 已存在的记录将被跳过，不会覆盖现有数据
              </Paragraph>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                loading={downloadingTemplate}
                style={{ marginTop: 8 }}
              >
                下载{label}导入模板
              </Button>
            </>
          ) : (
            <>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                1. 直接上传原始{label}Excel文件（.xlsx格式）
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                2. 系统将自动识别文件格式并导入数据（最大 {MAX_FILE_SIZE_MB}MB）
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                3. 将文件拖拽到下方上传区域，或点击选择文件
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                4. 已存在的记录将被跳过，不会覆盖现有数据
              </Paragraph>
            </>
          )}
        </Space>
      </Card>

      <Dragger
        accept=".xlsx"
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={uploading}
        multiple={false}
        aria-label={`上传${label}Excel文件`}
      >
        <p className="ant-upload-drag-icon">
          {uploading ? <FileExcelOutlined /> : <InboxOutlined />}
        </p>
        <p className="ant-upload-text">
          {uploading ? '正在导入...' : '点击或拖拽 Excel 文件到此区域'}
        </p>
        <p className="ant-upload-hint">
          仅支持 .xlsx 格式，文件大小不超过 {MAX_FILE_SIZE_MB}MB
        </p>
      </Dragger>

      {uploading && (
        <Progress
          percent={uploadProgress}
          status="active"
          strokeColor={{ from: '#108ee9', to: '#87d068' }}
        />
      )}
    </Space>
  );

  const tabItems = [
    {
      key: 'fabric' as const,
      label: '面料导入',
      children: renderUploadPanel('面料'),
    },
    {
      key: 'supplier' as const,
      label: '供应商导入',
      children: renderUploadPanel('供应商'),
    },
    {
      key: 'purchaseOrder' as const,
      label: '采购单导入',
      children: renderUploadPanel('采购单'),
    },
    {
      key: 'salesContract' as const,
      label: '购销合同/客户订单',
      children: renderUploadPanel('购销合同'),
    },
  ];

  return (
    <PageContainer
      title="数据导入"
      breadcrumbs={[{ label: '首页', path: '/' }, { label: '数据导入' }]}
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ImportTab)}
          items={tabItems}
        />
      </Card>

      <ImportResultModal
        open={showResult}
        result={result}
        onClose={() => setShowResult(false)}
        importType={resultTabRef.current}
      />
    </PageContainer>
  );
}
