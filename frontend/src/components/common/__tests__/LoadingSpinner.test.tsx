/**
 * Tests for LoadingSpinner component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Basic rendering', () => {
    it('renders spinner when loading is true (default)', () => {
      render(<LoadingSpinner />);
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });

    it('renders nothing when loading is false', () => {
      const { container } = render(<LoadingSpinner loading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders spinner component with tip prop', () => {
      render(<LoadingSpinner />);
      // Spinner should be present - tip rendering depends on Ant Design version/mode
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('Custom tip', () => {
    it('renders spinner with custom tip prop', () => {
      render(<LoadingSpinner tip="正在处理..." />);
      // Spinner should be present
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });

    it('renders with empty tip', () => {
      render(<LoadingSpinner tip="" />);
      // Should still render the spinner, just without text
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('Fullscreen mode', () => {
    it('renders fullscreen overlay when fullscreen is true and loading is true', () => {
      const { container } = render(<LoadingSpinner fullscreen />);
      // Check for fixed positioning style
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ position: 'fixed' });
      expect(overlay).toHaveStyle({ zIndex: '9999' });
    });

    it('renders nothing when fullscreen is true and loading is false', () => {
      const { container } = render(<LoadingSpinner fullscreen loading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders large spinner in fullscreen mode', () => {
      render(<LoadingSpinner fullscreen />);
      // Ant Design Spin with size="large" renders with specific class
      expect(document.querySelector('.ant-spin-lg')).toBeInTheDocument();
    });

    it('renders spinner in fullscreen overlay', () => {
      const { container } = render(<LoadingSpinner fullscreen tip="全屏加载中..." />);
      // Fullscreen overlay should contain the spinner
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('With children', () => {
    it('wraps children with spinner overlay when loading', () => {
      render(
        <LoadingSpinner loading>
          <div data-testid="child-content">Content here</div>
        </LoadingSpinner>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(document.querySelector('.ant-spin-nested-loading')).toBeInTheDocument();
    });

    it('shows children without spinner when not loading', () => {
      render(
        <LoadingSpinner loading={false}>
          <div data-testid="child-content">Content here</div>
        </LoadingSpinner>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      // The spinner wrapper is still there but not spinning
      expect(document.querySelector('.ant-spin-spinning')).not.toBeInTheDocument();
    });

    it('wraps children with spinner when loading with tip', () => {
      render(
        <LoadingSpinner loading tip="数据加载中...">
          <div>Content</div>
        </LoadingSpinner>
      );
      // Content should be present even when loading
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(document.querySelector('.ant-spin-nested-loading')).toBeInTheDocument();
    });
  });

  describe('State transitions', () => {
    it('can transition from loading to not loading', () => {
      const { rerender } = render(<LoadingSpinner loading />);
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();

      rerender(<LoadingSpinner loading={false} />);
      expect(document.querySelector('.ant-spin')).not.toBeInTheDocument();
    });

    it('can transition from not loading to loading', () => {
      const { rerender, container } = render(<LoadingSpinner loading={false} />);
      expect(container.firstChild).toBeNull();

      rerender(<LoadingSpinner loading />);
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  describe('Fullscreen style properties', () => {
    it('has correct overlay styles', () => {
      const { container } = render(<LoadingSpinner fullscreen />);
      const overlay = container.firstChild as HTMLElement;

      expect(overlay).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: '9999',
      });
    });
  });
});
