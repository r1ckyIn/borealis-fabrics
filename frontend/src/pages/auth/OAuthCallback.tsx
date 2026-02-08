/**
 * OAuth callback handler page.
 *
 * Backend handles the OAuth code exchange and sets HttpOnly cookie,
 * then redirects here with ?success=true or ?error=<message>.
 * On success, fetches current user via cookie-authenticated /auth/me endpoint.
 */

import { useEffect, useRef, useState } from 'react';

import { Alert, Button, Result, Spin, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { getCurrentUser, getWeworkLoginUrl } from '@/api/auth.api';
import { useAuthStore } from '@/store';

const { Text } = Typography;

type CallbackStatus = 'loading' | 'success' | 'error';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const success = searchParams.get('success');
  const errorParam = searchParams.get('error');

  // Initialize state based on URL params
  const [status, setStatus] = useState<CallbackStatus>(() => {
    if (errorParam) return 'error';
    if (success === 'true') return 'loading';
    return 'error';
  });
  const [errorMessage, setErrorMessage] = useState<string>(() => {
    if (errorParam) return errorParam;
    if (success !== 'true') return '缺少授权信息，请重新登录';
    return '';
  });
  const effectRan = useRef(false);

  useEffect(() => {
    // Skip if not a success callback (already handled by initial state)
    if (success !== 'true') return;

    // Prevent double execution in strict mode
    if (effectRan.current) return;
    effectRan.current = true;

    // Fetch current user using the cookie set by backend
    getCurrentUser()
      .then((user) => {
        setUser(user);
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
  }, [success, setUser, navigate]);

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
