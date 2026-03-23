/**
 * Unit tests for FabricImageGallery sub-component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { FabricImageGallery } from '../components/FabricImageGallery';
import type { FabricImage } from '@/types';

const mockImages: FabricImage[] = [
  {
    id: 1,
    fabricId: 1,
    url: 'https://example.com/img1.jpg',
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    fabricId: 1,
    url: 'https://example.com/img2.jpg',
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('FabricImageGallery', () => {
  it('should render upload button', () => {
    render(
      <FabricImageGallery
        images={undefined}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        isUploading={false}
        uploadProgress={0}
      />
    );

    expect(screen.getByText('上传图片')).toBeInTheDocument();
  });

  it('should render empty state when no images', () => {
    render(
      <FabricImageGallery
        images={undefined}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        isUploading={false}
        uploadProgress={0}
      />
    );

    expect(screen.getByText('暂无图片')).toBeInTheDocument();
  });

  it('should render images when provided', () => {
    render(
      <FabricImageGallery
        images={mockImages}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        isUploading={false}
        uploadProgress={0}
      />
    );

    // Images should be rendered (check img elements)
    const images = document.querySelectorAll('img');
    expect(images.length).toBe(2);
    expect(screen.queryByText('暂无图片')).not.toBeInTheDocument();
  });

  it('should show progress bar when uploading', () => {
    render(
      <FabricImageGallery
        images={undefined}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        isUploading={true}
        uploadProgress={50}
      />
    );

    // Progress component should be visible
    const progressBar = document.querySelector('.ant-progress');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render empty state for empty array', () => {
    render(
      <FabricImageGallery
        images={[]}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        isUploading={false}
        uploadProgress={0}
      />
    );

    expect(screen.getByText('暂无图片')).toBeInTheDocument();
  });
});
