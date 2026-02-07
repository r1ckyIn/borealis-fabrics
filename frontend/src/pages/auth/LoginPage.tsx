/**
 * Login page for WeWork OAuth authentication.
 *
 * Displays company branding and WeWork login button.
 * Redirects authenticated users to their intended destination.
 */

import { CodeOutlined, WechatWorkOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { devLogin, getWeworkLoginUrl } from '@/api/auth.api';
import { useAuthStore, useIsAuthenticated, useIsInitializing } from '@/store';

const { Title, Text } = Typography;

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const isInitializing = useIsInitializing();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [devLoading, setDevLoading] = useState(false);

  const state = location.state as LocationState | null;
  const from = state?.from || '/';

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    window.location.href = getWeworkLoginUrl();
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const response = await devLogin();
      setAuth(response);
      navigate(from, { replace: true });
    } catch {
      message.error('Dev login failed');
    } finally {
      setDevLoading(false);
    }
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

          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              铂润面料管理系统
            </Title>
            <Text type="secondary">Borealis Fabrics Management System</Text>
          </div>

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

          {/* Dev login (development only, tree-shaken in production) */}
          {import.meta.env.DEV && (
            <>
              <Divider style={{ margin: '8px 0' }}>Development Only</Divider>
              <Button
                size="large"
                icon={<CodeOutlined />}
                loading={devLoading}
                onClick={handleDevLogin}
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 16,
                  borderColor: '#fa8c16',
                  color: '#fa8c16',
                }}
              >
                Dev Login
              </Button>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
