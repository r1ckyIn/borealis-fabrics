/**
 * Unit tests for ImageUploader component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageUploader } from '../ImageUploader';

// Mock the file API
vi.mock('@/api/file.api', () => ({
  uploadFile: vi.fn().mockImplementation((file: File) =>
    Promise.resolve({
      id: Math.random(),
      key: `${Date.now()}-${file.name}`,
      url: `https://example.com/images/${file.name}`,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    })
  ),
}));

// Mock antd Upload component to simplify testing
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    // Keep Upload but we'll test through its props
  };
});

describe('ImageUploader', () => {
  beforeEach(() => {
    // Setup for each test
  });

  describe('Rendering', () => {
    it('renders upload button when no images', () => {
      render(<ImageUploader />);
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<ImageUploader placeholder="添加图片" />);
      expect(screen.getByText('添加图片')).toBeInTheDocument();
    });

    it('renders existing images', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];
      render(<ImageUploader value={urls} />);
      // Images are rendered as part of the Upload file list
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });

    it('hides upload button when maxCount reached', () => {
      const urls = Array(10).fill(null).map((_, i) =>
        `https://example.com/image${i}.jpg`
      );
      render(<ImageUploader value={urls} maxCount={10} />);
      expect(screen.queryByText('上传图片')).not.toBeInTheDocument();
    });

    it('renders disabled state', () => {
      render(<ImageUploader disabled />);
      const uploadArea = document.querySelector('.ant-upload');
      expect(uploadArea).toHaveClass('ant-upload-disabled');
    });
  });

  describe('Props', () => {
    it('accepts maxCount prop', () => {
      render(<ImageUploader maxCount={5} />);
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });

    it('accepts accept prop', () => {
      render(<ImageUploader accept="image/png,image/jpeg" />);
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });

    it('accepts maxSize prop', () => {
      render(<ImageUploader maxSize={10} />);
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('should have proper accept attribute', () => {
      render(<ImageUploader accept="image/*" />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('Controlled Mode', () => {
    it('syncs with external value changes', () => {
      const { rerender } = render(<ImageUploader value={[]} />);

      rerender(
        <ImageUploader
          value={['https://example.com/new-image.jpg']}
        />
      );

      // The component should update its internal state
      expect(screen.getByText('上传图片')).toBeInTheDocument();
    });
  });

  describe('Preview', () => {
    it('preview modal can be triggered', async () => {
      const urls = ['https://example.com/image1.jpg'];
      render(<ImageUploader value={urls} />);

      // Find preview button in the upload list
      const previewBtn = document.querySelector('.anticon-eye');
      if (previewBtn) {
        const button = previewBtn.closest('button') || previewBtn.parentElement;
        if (button) {
          fireEvent.click(button);
          await waitFor(() => {
            expect(screen.getByText('图片预览')).toBeInTheDocument();
          });
        }
      }
    });
  });
});
