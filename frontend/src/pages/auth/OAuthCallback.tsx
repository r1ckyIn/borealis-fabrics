/**
 * OAuth callback handler page.
 *
 * Handles WeWork OAuth redirect and exchanges authorization code for JWT token.
 * Shows loading state during token exchange, handles errors with retry option.
 */

import { useEffect, useRef, useState } from 'react';

import { Alert, Button, Result, Spin, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { getWeworkLoginUrl, handleOAuthCallback } from '@/api/auth.api';
import { useAuthStore } from '@/store';

const { Text } = Typography;

type CallbackStatus = 'loading' | 'success' | 'error';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const code = searchParams.get('code');

  // Initialize state based on whether code exists
  // This avoids calling setState in effect for missing code case
  const [status, setStatus] = useState<CallbackStatus>(() =>
    code ? 'loading' : 'error'
  );
  const [errorMessage, setErrorMessage] = useState<string>(() =>
    code ? '' : '缺少授权码，请重新登录'
  );
  const effectRan = useRef(false);

  useEffect(() => {
    // Skip if no code (already handled by initial state)
    if (!code) return;

    // Prevent double execution in strict mode
    if (effectRan.current) return;
    effectRan.current = true;

    // Exchange code for token
    handleOAuthCallback(code)
      .then((response) => {
        setAuth(response);
        setStatus('success');
        // Navigate to home after brief success message
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      })
      .catch((err: Error) => {
        setStatus('error');
        setErrorMessage(err.message || '登录失败，请重试');
      });
  }, [code, setAuth, navigate]);

  // Handle retry by redirecting to WeWork OAuth
  const handleRetry = () => {
    window.location.href = getWeworkLoginUrl();
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <Text>正在登录...</Text>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Result status="success" title="登录成功" subTitle="正在跳转..." />
      </div>
    );
  }

  // Error state
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Result
        status="error"
        title="登录失败"
        subTitle={<Alert type="error" title={errorMessage} showIcon />}
        extra={[
          <Button key="retry" type="primary" onClick={handleRetry}>
            重试
          </Button>,
          <Link key="login" to="/login">
            <Button>返回登录</Button>
          </Link>,
        ]}
      />
    </div>
  );
}
