/**
 * Application header component with user menu.
 *
 * Features:
 * - Sidebar toggle button
 * - User avatar and dropdown menu
 * - Logout functionality
 */

import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Layout, Space, Tag, theme } from 'antd';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { logout } from '@/api/auth.api';
import { useAuthStore, useUser } from '@/store';

const { Header: AntHeader } = Layout;

export interface HeaderProps {
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
  /** Callback when collapse toggle is clicked. */
  onToggleCollapse: () => void;
}

/**
 * Application header with navigation and user menu.
 */
export function Header({ collapsed, onToggleCollapse }: HeaderProps) {
  const navigate = useNavigate();
  const user = useUser();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { token } = theme.useToken();

  const handleLogout = useCallback(() => {
    logout().catch(() => {});
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        padding: '0 24px',
        background: token.colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {/* Left: Collapse toggle */}
      <div
        onClick={onToggleCollapse}
        style={{
          fontSize: 18,
          cursor: 'pointer',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
        }}
        role="button"
        tabIndex={0}
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onToggleCollapse();
          }
        }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>

      {/* Right: User menu */}
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{user?.name ?? '用户'}</span>
          {import.meta.env.DEV && <Tag color="warning">DEV</Tag>}
        </Space>
      </Dropdown>
    </AntHeader>
  );
}
