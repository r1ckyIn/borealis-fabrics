/**
 * 404 Not Found page.
 *
 * Displays when user navigates to a non-existent route.
 */

import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
};

export default function NotFoundPage(): React.ReactNode {
  const navigate = useNavigate();

  return (
    <div style={containerStyle}>
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在"
        extra={
          <Button type="primary" onClick={() => navigate('/products/fabrics')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
}
