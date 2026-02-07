/**
 * Login page for WeWork OAuth authentication.
 *
 * Displays company branding and WeWork login button.
 * Redirects authenticated users to their intended destination.
 */

import { WechatWorkOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';

import { getWeworkLoginUrl } from '@/api/auth.api';
import { useIsAuthenticated, useIsInitializing } from '@/store';

const { Title, Text } = Typography;

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const isInitializing = useIsInitializing();

  // Get redirect target from location state
  const state = location.state as LocationState | null;
  const from = state?.from || '/';

  // Show loading during initialization
  if (isInitializing) {
    return null;
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  // Handle WeWork OAuth login
  const handleLogin = () => {
    window.location.href = getWeworkLoginUrl();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          textAlign: 'center',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        styles={{
          body: {
            padding: '48px 32px',
          },
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Logo placeholder */}
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto',
              borderRadius: '50%',
              background: '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 32,
                fontWeight: 'bold',
              }}
            >
              BF
            </Text>
          </div>

          {/* Title */}
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              铂润面料管理系统
            </Title>
            <Text type="secondary">Borealis Fabrics Management System</Text>
          </div>

          {/* Login button */}
          <Button
            type="primary"
            size="large"
            icon={<WechatWorkOutlined />}
            onClick={handleLogin}
            style={{
              width: '100%',
              height: 48,
              fontSize: 16,
              background: '#1DA57A',
              borderColor: '#1DA57A',
            }}
          >
            企业微信登录
          </Button>
        </Space>
      </Card>
    </div>
  );
}
