/**
 * Navigation sidebar component with menu items.
 *
 * Features:
 * - Collapsible sidebar with menu items
 * - Route-aware active item highlighting
 * - Ant Design icons for each menu item
 */

import {
  FileTextOutlined,
  ImportOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SkinOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type MenuItem = Required<MenuProps>['items'][number];

export interface SidebarProps {
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
}

/**
 * Navigation menu items configuration.
 */
const menuItems: MenuItem[] = [
  {
    key: '/fabrics',
    icon: <SkinOutlined />,
    label: '面料管理',
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
 */
export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine selected key based on current path
  // Match the first segment of the path (e.g., /fabrics/123 -> /fabrics)
  const selectedKey = useMemo(
    () => '/' + location.pathname.split('/')[1],
    [location.pathname]
  );

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
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );
}
