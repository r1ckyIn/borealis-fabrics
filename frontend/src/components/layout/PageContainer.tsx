/**
 * Page container component with title and breadcrumbs.
 *
 * Provides consistent page structure across the application.
 */

import { Breadcrumb, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const { Title } = Typography;

export interface BreadcrumbItem {
  /** Display label for the breadcrumb. */
  label: string;
  /** Optional path for navigation. If omitted, item is not clickable. */
  path?: string;
}

export interface PageContainerProps {
  /** Page title displayed at the top. */
  title?: string;
  /** Breadcrumb navigation items. */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional extra content to render in the header (e.g., action buttons). */
  extra?: ReactNode;
  /** Page content. */
  children: ReactNode;
}

/**
 * Page container with optional title, breadcrumbs, and action area.
 *
 * @example
 * ```tsx
 * <PageContainer
 *   title="面料列表"
 *   breadcrumbs={[{ label: '首页', path: '/' }, { label: '面料管理' }]}
 *   extra={<Button type="primary">新建</Button>}
 * >
 *   <FabricTable />
 * </PageContainer>
 * ```
 */
export function PageContainer({ title, breadcrumbs, extra, children }: PageContainerProps) {
  return (
    <div style={{ padding: 24 }}>
      {/* Header section with breadcrumbs, title, and extra */}
      {(breadcrumbs || title || extra) && (
        <div style={{ marginBottom: 16 }}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb
              style={{ marginBottom: title ? 8 : 0 }}
              items={breadcrumbs.map((item, index) => ({
                key: index,
                title: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
              }))}
            />
          )}

          {/* Title and extra row */}
          {(title || extra) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {title && (
                <Title level={4} style={{ margin: 0 }}>
                  {title}
                </Title>
              )}
              {extra && <div>{extra}</div>}
            </div>
          )}
        </div>
      )}

      {/* Page content */}
      {children}
    </div>
  );
}
