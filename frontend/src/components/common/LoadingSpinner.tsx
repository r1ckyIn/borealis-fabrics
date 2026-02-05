import type { CSSProperties, ReactNode } from 'react';
import { Spin } from 'antd';

export interface LoadingSpinnerProps {
  loading?: boolean;
  tip?: string;
  fullscreen?: boolean;
  children?: ReactNode;
}

const fullscreenStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 9999,
};

export function LoadingSpinner({
  loading = true,
  tip = '加载中...',
  fullscreen = false,
  children,
}: LoadingSpinnerProps): ReactNode {
  if (fullscreen) {
    if (!loading) return null;
    return (
      <div style={fullscreenStyle}>
        <Spin size="large" tip={tip} />
      </div>
    );
  }

  if (children) {
    return (
      <Spin spinning={loading} tip={tip}>
        {children}
      </Spin>
    );
  }

  if (!loading) return null;
  return <Spin tip={tip} />;
}
