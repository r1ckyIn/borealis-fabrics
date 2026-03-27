/**
 * Customer address tab content.
 * Renders address list with label and default tags.
 */

import { Row, Col, Card, Empty, Tag, Space, Typography } from 'antd';
import { EnvironmentOutlined, StarFilled } from '@ant-design/icons';

import type { Address } from '@/types';

const { Text } = Typography;

export interface CustomerAddressTabProps {
  addresses: Address[] | null | undefined;
}

/** Format full address string for display. */
function formatAddress(address: Address): string {
  return `${address.province}${address.city}${address.district}${address.detailAddress}`;
}

/**
 * Renders the customer address list or empty state.
 */
export function CustomerAddressTab({ addresses }: CustomerAddressTabProps): React.ReactElement {
  if (!addresses || addresses.length === 0) {
    return <Empty description="暂无收货地址" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {addresses.map((address, index) => (
        <Col xs={24} md={12} key={index}>
          <Card size="small" hoverable>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <EnvironmentOutlined className="text-blue-500" />
                <Text strong>{address.contactName}</Text>
                <Text type="secondary">{address.contactPhone}</Text>
                {address.label && <Tag color="blue">{address.label}</Tag>}
                {address.isDefault && (
                  <Tag color="gold" icon={<StarFilled />}>
                    默认
                  </Tag>
                )}
              </Space>
              <Text type="secondary" style={{ paddingLeft: 22 }}>
                {formatAddress(address)}
              </Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
