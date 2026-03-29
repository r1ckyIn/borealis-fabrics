/**
 * Navigation sidebar component with menu items.
 *
 * Features:
 * - Collapsible sidebar with menu items
 * - SubMenu pattern for product category navigation
 * - Route-aware active item highlighting
 * - Ant Design icons for each menu item
 * - Conditional menu items based on user role (admin sees audit log)
 */

import {
  AppstoreOutlined,
  AuditOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ImportOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SkinOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUser } from '@/store/authStore';

type MenuItem = Required<MenuProps>['items'][number];

export interface SidebarProps {
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
}

/**
 * Sidebar navigation component.
 *
 * Displays the main navigation menu with icons.
 * Highlights the current route and handles navigation on click.
 * Product management SubMenu auto-expands when a product sub-page is active.
 * Admin users see "审计日志" menu item; all users see "数据导出".
 */
export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();

  // Build menu items based on user role
  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        key: '/products',
        icon: <AppstoreOutlined />,
        label: '产品管理',
        children: [
          { key: '/products/fabrics', icon: <SkinOutlined />, label: '面料' },
          { key: '/products/iron-frames', label: '铁架' },
          { key: '/products/motors', label: '电机' },
          { key: '/products/mattresses', label: '床垫' },
          { key: '/products/accessories', label: '配件' },
        ],
      },
      {
        key: '/suppliers',
        icon: <ShopOutlined />,
        label: '供应商管理',
      },
      {
        key: '/customers',
        icon: <TeamOutlined />,
        label: '客户管理',
      },
      {
        key: '/quotes',
        icon: <FileTextOutlined />,
        label: '报价管理',
      },
      {
        key: '/orders',
        icon: <ShoppingCartOutlined />,
        label: '订单管理',
      },
      {
        key: '/import',
        icon: <ImportOutlined />,
        label: '数据导入',
      },
    ];

    // Admin-only: audit log
    if (user?.isAdmin) {
      items.push({
        key: '/audit',
        icon: <AuditOutlined />,
        label: '审计日志',
      });
    }

    // All users: data export
    items.push({
      key: '/export',
      icon: <DownloadOutlined />,
      label: '数据导出',
    });

    return items;
  }, [user?.isAdmin]);

  // Manage open keys for SubMenu expansion.
  // User-toggled state is tracked; product SubMenu auto-expands on initial navigation.
  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    location.pathname.startsWith('/products') ? ['/products'] : []
  );

  // Computed open keys: respect collapsed state (no open submenus when collapsed)
  const menuOpenKeys = useMemo(() => {
    if (collapsed) return [];
    return openKeys;
  }, [collapsed, openKeys]);

  // Determine selected key based on current path
  const selectedKey = useMemo(() => {
    const { pathname } = location;
    // Match product sub-pages (e.g., /products/iron-frames/123 -> /products/iron-frames)
    if (pathname.startsWith('/products/')) {
      const segments = pathname.split('/');
      return `/${segments[1]}/${segments[2]}`;
    }
    // Match other top-level pages (e.g., /orders/123 -> /orders)
    return '/' + pathname.split('/')[1];
  }, [location]);

  // Handle menu item click
  const handleMenuClick = useCallback<Required<MenuProps>['onClick']>(
    ({ key }) => {
      navigate(key);
    },
    [navigate]
  );

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo area */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: collapsed ? 16 : 18,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {collapsed ? 'BF' : '铂润面料'}
        </span>
      </div>

      {/* Navigation menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={menuOpenKeys}
        onOpenChange={setOpenKeys}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );
}
