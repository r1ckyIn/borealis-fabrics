/**
 * Navigation sidebar component with menu items.
 *
 * Features:
 * - Collapsible sidebar with menu items
 * - SubMenu pattern for product category navigation
 * - Route-aware active item highlighting
 * - Ant Design icons for each menu item
 */

import {
  AppstoreOutlined,
  FileTextOutlined,
  ImportOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SkinOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type MenuItem = Required<MenuProps>['items'][number];

export interface SidebarProps {
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
}

/**
 * Navigation menu items configuration.
 * Product management uses SubMenu pattern with 5 sub-items.
 */
const menuItems: MenuItem[] = [
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

/**
 * Sidebar navigation component.
 *
 * Displays the main navigation menu with icons.
 * Highlights the current route and handles navigation on click.
 * Product management SubMenu auto-expands when a product sub-page is active.
 */
export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Manage open keys for SubMenu expansion
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>([]);

  // Auto-expand product SubMenu when navigating to a product page
  useEffect(() => {
    if (location.pathname.startsWith('/products')) {
      setMenuOpenKeys((prev) =>
        prev.includes('/products') ? prev : [...prev, '/products']
      );
    }
  }, [location.pathname]);

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
        onOpenChange={setMenuOpenKeys}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );
}
