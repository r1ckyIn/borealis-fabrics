/**
 * Excel import page for batch data import.
 * Supports fabric and supplier bulk import via Excel files.
 */

import { useState, useCallback } from 'react';
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

  const handleDownloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      await TAB_CONFIG[activeTab].download();
      message.success('模板下载成功');
    } catch {
      message.error('模板下载失败，请重试');
    } finally {
      setDownloadingTemplate(false);
    }
  }, [activeTab]);

  const handleImport = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        message.error(`文件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const importResult = await TAB_CONFIG[activeTab].import(file, setUploadProgress);

        setResult(importResult);
        setShowResult(true);

        if (importResult.failureCount === 0) {
          message.success(
            `成功导入 ${importResult.successCount} 条记录`
          );
        } else {
          message.warning(
            `导入完成: ${importResult.successCount} 成功, ${importResult.failureCount} 失败`
          );
        }
      } catch {
        message.error('导入失败，请检查文件格式后重试');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [activeTab]
  );

  const beforeUpload = useCallback(
    (file: UploadFile) => {
      const isXlsx =
        file.type === ACCEPTED_MIME || file.name?.endsWith('.xlsx');
      if (!isXlsx) {
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
        importType={activeTab}
      />
    </PageContainer>
  );
}
