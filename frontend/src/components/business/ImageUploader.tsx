/**
 * Image uploader component with drag-and-drop support.
 * Supports multiple images, preview, and deletion.
 */

import { useState } from 'react';
import { Upload, Modal, message, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import type { RcFile } from 'antd/es/upload/interface';

import { uploadFile } from '@/api/file.api';

export interface ImageUploaderProps {
  /** Current image URLs (controlled mode) */
  value?: string[];
  /** Callback when images change */
  onChange?: (urls: string[]) => void;
  /** Maximum number of images (default: 10) */
  maxCount?: number;
  /** Accepted file types (default: image/*) */
  accept?: string;
  /** Maximum file size in MB (default: 5) */
  maxSize?: number;
  /** Disable uploading */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

interface UploadItem extends UploadFile {
  url?: string;
}

/**
 * Convert URL array to UploadFile list.
 */
function urlsToFileList(urls: string[]): UploadItem[] {
  return urls.map((url, index) => ({
    uid: `${index}-${url}`,
    name: `image-${index + 1}`,
    status: 'done' as const,
    url,
  }));
}

/**
 * Convert UploadFile list to URL array.
 */
function fileListToUrls(fileList: UploadItem[]): string[] {
  return fileList
    .filter((file) => file.status === 'done' && file.url)
    .map((file) => file.url as string);
}

export function ImageUploader({
  value = [],
  onChange,
  maxCount = 10,
  accept = 'image/*',
  maxSize = 5,
  disabled = false,
  placeholder = '上传图片',
}: ImageUploaderProps): React.ReactElement {
  const [fileList, setFileList] = useState<UploadItem[]>(() => urlsToFileList(value));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploading, setUploading] = useState(false);

  // Sync fileList when value changes externally
  if (JSON.stringify(fileListToUrls(fileList)) !== JSON.stringify(value)) {
    setFileList(urlsToFileList(value));
  }

  /**
   * Validate file before upload.
   */
  const beforeUpload = (file: RcFile): boolean => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`);
      return false;
    }

    return true;
  };

  /**
   * Handle custom upload.
   */
  const customUpload = async (options: { file: RcFile; onSuccess: (response: unknown) => void; onError: (error: Error) => void; onProgress: (event: { percent: number }) => void }) => {
    const { file, onSuccess, onError, onProgress } = options;

    setUploading(true);
    try {
      const result = await uploadFile(file, (percent) => {
        onProgress({ percent });
      });

      onSuccess(result);

      // Update file list with the new URL
      const newFile: UploadItem = {
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: result.url,
      };

      const updatedList = [...fileList, newFile];
      setFileList(updatedList);
      onChange?.(fileListToUrls(updatedList));
    } catch (error) {
      onError(error as Error);
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle file removal.
   */
  const handleRemove = (file: UploadItem): boolean => {
    const updatedList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(updatedList);
    onChange?.(fileListToUrls(updatedList));
    return true;
  };

  /**
   * Handle preview.
   */
  const handlePreview = async (file: UploadItem): Promise<void> => {
    if (file.url) {
      setPreviewImage(file.url);
      setPreviewOpen(true);
    }
  };

  /**
   * Handle file list change (for drag reorder support in future).
   */
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    // Filter out failed uploads
    const validFiles = newFileList.filter(
      (file) => file.status === 'done' || file.status === 'uploading'
    ) as UploadItem[];
    setFileList(validFiles);
  };

  const uploadButton = (
    <div className="flex flex-col items-center justify-center">
      <PlusOutlined />
      <div className="mt-2 text-sm">{placeholder}</div>
    </div>
  );

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        accept={accept}
        maxCount={maxCount}
        disabled={disabled || uploading}
        beforeUpload={beforeUpload}
        customRequest={customUpload as unknown as UploadProps['customRequest']}
        onRemove={handleRemove}
        onPreview={handlePreview}
        onChange={handleChange}
        showUploadList={{
          showPreviewIcon: true,
          showRemoveIcon: !disabled,
          previewIcon: <EyeOutlined />,
          removeIcon: <DeleteOutlined />,
        }}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>
      <Modal
        open={previewOpen}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <Image
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
          preview={false}
        />
      </Modal>
    </>
  );
}

export default ImageUploader;
