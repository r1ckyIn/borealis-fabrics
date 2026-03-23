/**
 * Fabric image gallery tab content.
 * Handles image upload and displays image grid with delete actions.
 */

import {
  Button,
  Space,
  Image,
  Upload,
  Progress,
  Popconfirm,
  Empty,
} from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';

import type { FabricImage } from '@/types';

export interface FabricImageGalleryProps {
  images: FabricImage[] | undefined;
  onUpload: (file: RcFile) => Promise<boolean>;
  onDelete: (imageId: number) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
}

export function FabricImageGallery({
  images,
  onUpload,
  onDelete,
  isUploading,
  uploadProgress,
}: FabricImageGalleryProps): React.ReactElement {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={onUpload}
          disabled={isUploading}
        >
          <Button
            icon={<UploadOutlined />}
            loading={isUploading}
          >
            上传图片
          </Button>
        </Upload>
        {isUploading && (
          <Progress
            percent={uploadProgress}
            size="small"
            style={{ marginTop: 8, maxWidth: 200 }}
          />
        )}
      </div>
      {images?.length ? (
        <Image.PreviewGroup>
          <Space wrap size="large">
            {images.map((img) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <Image
                  src={img.url}
                  alt={`面料图片 ${img.sortOrder}`}
                  width={150}
                  height={150}
                  style={{ objectFit: 'cover' }}
                />
                <Popconfirm
                  title="确定要删除这张图片吗？"
                  onConfirm={() => onDelete(img.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(255,255,255,0.9)',
                    }}
                  />
                </Popconfirm>
              </div>
            ))}
          </Space>
        </Image.PreviewGroup>
      ) : (
        <Empty description="暂无图片" />
      )}
    </div>
  );
}
