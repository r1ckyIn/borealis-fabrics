/**
 * Customer basic info tab content.
 * Renders customer fields using Ant Design Descriptions.
 */

import { Descriptions, Typography } from 'antd';

import { formatDate } from '@/utils';
import {
  CreditType,
  CREDIT_TYPE_LABELS,
} from '@/types';
import type { Customer } from '@/types';

const { Text } = Typography;

export interface CustomerBasicInfoProps {
  customer: Customer;
}

/**
 * Renders customer detail fields in a bordered Descriptions layout.
 */
export function CustomerBasicInfo({ customer }: CustomerBasicInfoProps): React.ReactElement {
  return (
    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
      <Descriptions.Item label="公司名称">
        <Text strong>{customer.companyName}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="联系人">
        {customer.contactName ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="电话">
        {customer.phone ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="微信">
        {customer.wechat ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="邮箱">
        {customer.email ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="结算方式">
        {CREDIT_TYPE_LABELS[customer.creditType]}
      </Descriptions.Item>
      <Descriptions.Item label="账期天数">
        {customer.creditType === CreditType.CREDIT && customer.creditDays !== null
          ? `${customer.creditDays} 天`
          : '-'}
      </Descriptions.Item>
      <Descriptions.Item label="备注" span={2}>
        {customer.notes ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="创建时间">
        {formatDate(customer.createdAt)}
      </Descriptions.Item>
      <Descriptions.Item label="更新时间">
        {formatDate(customer.updatedAt)}
      </Descriptions.Item>
    </Descriptions>
  );
}
