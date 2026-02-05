/**
 * React error boundary component.
 * Catches errors in child components and displays a fallback UI.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button, Result } from 'antd';

// =====================
// Types
// =====================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =====================
// Component
// =====================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Result
          status="error"
          title="出错了"
          subTitle={error?.message ?? '页面发生了一些错误，请稍后重试'}
          extra={
            <Button type="primary" onClick={this.handleRetry}>
              重试
            </Button>
          }
        />
      );
    }

    return children;
  }
}
