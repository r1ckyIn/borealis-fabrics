import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button, Result } from 'antd';
import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

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
    // Report to Sentry
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? '' } },
    });
    logger.error('ErrorBoundary caught an error', error, { componentStack: errorInfo.componentStack ?? '' });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

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
}
