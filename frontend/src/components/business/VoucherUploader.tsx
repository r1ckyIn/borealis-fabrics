/**
 * Voucher uploader component with drag-and-drop support.
 * Accepts images, PDF, Word, and Excel files.
 * Form-controlled: propagates fileId array to parent via onChange.
 */

import { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import type { RcFile } from 'antd/es/upload/interface';
import { uploadFile } from '@/api/file.api';
import type { FileEntity } from '@/types/entities.types';

const { Dragger } = Upload;

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx';
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
];

export interface VoucherUploaderProps {
  value?: number[];
  onChange?: (fileIds: number[]) => void;
  disabled?: boolean;
}

/**
 * Extract file extension from filename (lowercase).
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

export function VoucherUploader({
  value = [],
  onChange,
  disabled = false,
}: VoucherUploaderProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  function beforeUpload(file: RcFile): boolean {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      message.error(
        `Unsupported file type: ${ext}. Allowed: ${ACCEPT}`
      );
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      message.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }
    return true;
  }

  function customRequest(options: {
    file: File | string | Blob;
    onSuccess?: (response: unknown) => void;
    onError?: (error: Error) => void;
    onProgress?: (event: { percent: number }) => void;
  }) {
    const { file, onSuccess, onError, onProgress } = options;
    uploadFile(file as File, (percent: number) => {
      onProgress?.({ percent });
    })
      .then((result: FileEntity) => {
        const newFileIds = [...value, result.id];
        onChange?.(newFileIds);
        onSuccess?.(result);
      })
      .catch((err: Error) => {
        message.error('Upload failed');
        onError?.(err);
      });
  }

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  return (
    <Dragger
      accept={ACCEPT}
      multiple
      fileList={fileList}
      beforeUpload={beforeUpload}
      customRequest={customRequest as unknown as UploadProps['customRequest']}
      onChange={handleChange}
      disabled={disabled}
      data-testid="voucher-uploader"
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag files to upload vouchers</p>
      <p className="ant-upload-hint">
        Supports: images, PDF, Word, Excel (max {MAX_FILE_SIZE_MB}MB per file)
      </p>
    </Dragger>
  );
}
