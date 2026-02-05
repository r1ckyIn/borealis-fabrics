/**
 * Loading spinner component with optional fullscreen overlay.
 */

import type { ReactNode } from 'react';
import { Spin } from 'antd';

// =====================
// Types
// =====================

export interface LoadingSpinnerProps {
  loading?: boolean;
  tip?: string;
  fullscreen?: boolean;
  children?: ReactNode;
}

// =====================
// Styles
// =====================

const fullscreenStyle: React.CSSProperties = {
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

// =====================
// Component
// =====================

export function LoadingSpinner({
  loading = true,
  tip = '加载中...',
  fullscreen = false,
  children,
}: LoadingSpinnerProps): ReactNode {
  // Fullscreen mode
  if (fullscreen) {
    if (!loading) return null;

    return (
      <div style={fullscreenStyle}>
        <Spin size="large" tip={tip} />
      </div>
    );
  }

  // Inline mode with children
  if (children) {
    return (
      <Spin spinning={loading} tip={tip}>
        {children}
      </Spin>
    );
  }

  // Simple spinner
  if (!loading) return null;

  return <Spin tip={tip} />;
}
