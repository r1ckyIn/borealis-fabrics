/**
 * Excel import page for batch data import.
 * Supports fabric and supplier bulk import via Excel files.
 */

import { useState, useCallback, useRef } from 'react';
import { Card, Tabs, Button, Upload, Progress, Space, Typography, message } from 'antd';
import {
  DownloadOutlined,
  InboxOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';

import { PageContainer } from '@/components/layout/PageContainer';
import { ImportResultModal } from '@/components/business';
import { importApi } from '@/api/import.api';
import type { ImportResult } from '@/types';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ImportTab = 'fabric' | 'supplier';

interface TabConfig {
  download: () => Promise<void>;
  import: (file: File, onProgress?: (p: number) => void) => Promise<ImportResult>;
}

const TAB_CONFIG: Record<ImportTab, TabConfig> = {
  fabric: { download: importApi.downloadFabricTemplate, import: importApi.importFabrics },
  supplier: { download: importApi.downloadSupplierTemplate, import: importApi.importSuppliers },
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

  const handleDownloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      await TAB_CONFIG[activeTab].download();
      message.success('模板下载成功');
    } catch (error) {
      console.error('Template download failed:', error);
      const apiError = error as { code?: number };
      if (apiError.code && apiError.code >= 500) {
        message.error('服务器错误，请稍后重试');
      } else {
        message.error('模板下载失败，请检查网络连接');
      }
    } finally {
      setDownloadingTemplate(false);
    }
  }, [activeTab]);

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

        if (importResult.failureCount === 0) {
          const skippedInfo = importResult.skippedCount > 0
            ? `, ${importResult.skippedCount} 条已存在跳过`
            : '';
          message.success(
            `成功导入 ${importResult.successCount} 条记录${skippedInfo}`
          );
        } else {
          const skippedInfo = importResult.skippedCount > 0
            ? `, ${importResult.skippedCount} 跳过`
            : '';
          message.warning(
            `导入完成: ${importResult.successCount} 成功${skippedInfo}, ${importResult.failureCount} 失败`
          );
        }
      } catch (error) {
        console.error('Import failed:', error);
        const apiError = error as { code?: number; message?: string };
        if (apiError.code && apiError.code >= 500) {
          message.error('服务器处理失败，请稍后重试');
        } else if (apiError.message?.includes('format') || apiError.message?.includes('格式')) {
          message.error('文件格式错误，请检查是否使用了正确的模板');
        } else {
          message.error('导入失败，请检查文件格式后重试');
        }
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
      <Card size="small">
        <Space direction="vertical" size="small">
          <Text strong>操作说明</Text>
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
