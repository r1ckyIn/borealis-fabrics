import { ConfigProvider, App as AntdApp, Typography, Space } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const { Title, Text } = Typography;

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
          }}
        >
          <Space direction="vertical" align="center" size="large">
            <Title level={2} style={{ margin: 0 }}>
              铂润面料管理系统
            </Title>
            <Text type="secondary">Borealis Fabrics Management System</Text>
            <Text type="secondary">阶段 2 开发中...</Text>
          </Space>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
