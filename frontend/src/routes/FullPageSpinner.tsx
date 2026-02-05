/**
 * Full page loading spinner for route transitions.
 */

import { Spin } from 'antd';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
};

export function FullPageSpinner() {
  return (
    <div style={containerStyle}>
      <Spin size="large" tip="加载中..." />
    </div>
  );
}
