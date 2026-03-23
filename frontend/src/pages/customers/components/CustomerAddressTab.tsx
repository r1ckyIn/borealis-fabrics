/**
 * Customer address tab content.
 * Renders address list with label and default tags.
 */

import { List, Empty, Tag, Space } from 'antd';
import { EnvironmentOutlined, StarFilled } from '@ant-design/icons';

import type { Address } from '@/types';

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
    <List
      dataSource={addresses}
      renderItem={(address, index) => (
        <List.Item
          className="rounded-lg border border-gray-200 mb-2 p-4"
          key={index}
        >
          <List.Item.Meta
            avatar={<EnvironmentOutlined className="text-2xl text-blue-500" />}
            title={
              <Space>
                <span>
                  {address.contactName} {address.contactPhone}
                </span>
                {address.label && <Tag color="blue">{address.label}</Tag>}
                {address.isDefault && (
                  <Tag color="gold" icon={<StarFilled />}>
                    默认
                  </Tag>
                )}
              </Space>
            }
            description={formatAddress(address)}
          />
        </List.Item>
      )}
    />
  );
}
