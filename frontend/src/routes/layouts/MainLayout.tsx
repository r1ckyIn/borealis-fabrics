/**
 * Main application layout with sidebar, header, and content area.
 *
 * Features:
 * - Collapsible sidebar navigation
 * - Top header with user menu
 * - Responsive behavior (auto-collapse on tablet)
 * - Zustand integration for sidebar state
 */

import { Layout } from 'antd';
import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { Header, Sidebar } from '@/components/layout';
import { useUIStore } from '@/store';

const { Content, Sider } = Layout;

/** Breakpoint for auto-collapsing sidebar (tablet width). */
const TABLET_BREAKPOINT = 992;

/** Sidebar width when expanded. */
const SIDER_WIDTH = 200;

/** Sidebar width when collapsed. */
const SIDER_COLLAPSED_WIDTH = 80;

/**
 * Main layout component wrapping all protected pages.
 *
 * Provides the application shell with:
 * - Collapsible sidebar for navigation
 * - Header with user menu
 * - Content area for page rendering
 */
export default function MainLayout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  // Handle sidebar collapse change from Sider component
  const handleCollapse = useCallback(
    (collapsed: boolean) => {
      setSidebarCollapsed(collapsed);
    },
    [setSidebarCollapsed]
  );

  // Auto-collapse sidebar on tablet/mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < TABLET_BREAKPOINT) {
        setSidebarCollapsed(true);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={handleCollapse}
        trigger={null}
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </Sider>

      {/* Main content area */}
      <Layout
        style={{
          marginLeft: sidebarCollapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

        {/* Content */}
        <Content
          style={{
            minHeight: 'calc(100vh - 64px)',
            background: '#f5f5f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
