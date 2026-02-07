/**
 * Tests for PageContainer component.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PageContainer } from '../PageContainer';

describe('PageContainer', () => {
  it('should render title', () => {
    render(
      <MemoryRouter>
        <PageContainer title="Test Title">
          <div>Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render breadcrumbs', () => {
    render(
      <MemoryRouter>
        <PageContainer
          breadcrumbs={[
            { label: '首页', path: '/' },
            { label: '面料管理', path: '/fabrics' },
            { label: '面料详情' },
          ]}
        >
          <div>Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('面料管理')).toBeInTheDocument();
    expect(screen.getByText('面料详情')).toBeInTheDocument();
  });

  it('should render breadcrumb links with correct paths', () => {
    render(
      <MemoryRouter>
        <PageContainer
          breadcrumbs={[
            { label: '首页', path: '/' },
            { label: '面料管理', path: '/fabrics' },
            { label: '面料详情' },
          ]}
        >
          <div>Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    // Items with paths should be links
    const homeLink = screen.getByText('首页').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');

    const fabricsLink = screen.getByText('面料管理').closest('a');
    expect(fabricsLink).toHaveAttribute('href', '/fabrics');
  });

  it('should render breadcrumb item without link when no path', () => {
    render(
      <MemoryRouter>
        <PageContainer
          breadcrumbs={[
            { label: '首页', path: '/' },
            { label: '当前页面' },
          ]}
        >
          <div>Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    // Item without path should not be a link
    const currentPage = screen.getByText('当前页面');
    expect(currentPage.closest('a')).toBeNull();
  });

  it('should render extra content', () => {
    render(
      <MemoryRouter>
        <PageContainer title="Test" extra={<button>New Button</button>}>
          <div>Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'New Button' })).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <MemoryRouter>
        <PageContainer>
          <div data-testid="child-content">Child Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should not render header section when no title, breadcrumbs, or extra', () => {
    const { container } = render(
      <MemoryRouter>
        <PageContainer>
          <div>Only Content</div>
        </PageContainer>
      </MemoryRouter>
    );

    // The header section (with marginBottom: 16) should not exist
    // Only the content should be rendered directly in the padding container
    const contentDiv = screen.getByText('Only Content');
    const parentDiv = contentDiv.parentElement;

    // Parent should have padding: 24 (the main container)
    expect(parentDiv).toHaveStyle({ padding: '24px' });

    // Should only have one child (the content), no header section
    expect(container.querySelectorAll('[style*="margin-bottom: 16px"]')).toHaveLength(0);
  });
});
