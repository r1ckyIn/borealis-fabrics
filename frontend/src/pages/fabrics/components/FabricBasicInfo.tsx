/**
 * Fabric basic info tab content.
 * Renders fabric details in Ant Design Descriptions layout.
 */

import { Descriptions, Tag, Space, Typography } from 'antd';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { formatDate } from '@/utils';
import type { Fabric } from '@/types';

const { Text } = Typography;

export interface FabricBasicInfoProps {
  fabric: Fabric;
}

export function FabricBasicInfo({ fabric }: FabricBasicInfoProps): React.ReactElement {
  return (
    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
      <Descriptions.Item label="面料编码">
        <Text strong>{fabric.fabricCode}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="面料名称">{fabric.name}</Descriptions.Item>
      <Descriptions.Item label="颜色">
        {fabric.color ? <Tag>{fabric.color}</Tag> : '-'}
      </Descriptions.Item>
      <Descriptions.Item label="主要材质">
        {fabric.material?.primary ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="次要材质">
        {fabric.material?.secondary ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="成分比例">
        {fabric.composition ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="克重">
        {fabric.weight !== null ? `${fabric.weight} g/m²` : '-'}
      </Descriptions.Item>
      <Descriptions.Item label="幅宽">
        {fabric.width !== null ? `${fabric.width} cm` : '-'}
      </Descriptions.Item>
      <Descriptions.Item label="厚度">
        {fabric.thickness ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="手感">{fabric.handFeel ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="光泽度">
        {fabric.glossLevel ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="应用领域">
        {fabric.application?.length ? (
          <Space wrap>
            {fabric.application.map((app) => (
              <Tag key={app} color="blue">
                {app}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        )}
      </Descriptions.Item>
      <Descriptions.Item label="默认单价">
        <AmountDisplay value={fabric.defaultPrice} suffix="/米" />
      </Descriptions.Item>
      <Descriptions.Item label="默认交期">
        {fabric.defaultLeadTime !== null
          ? `${fabric.defaultLeadTime} 天`
          : '-'}
      </Descriptions.Item>
      <Descriptions.Item label="标签" span={3}>
        {fabric.tags?.length ? (
          <Space wrap>
            {fabric.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        )}
      </Descriptions.Item>
      <Descriptions.Item label="面料描述" span={3}>
        {fabric.description ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="备注" span={3}>
        {fabric.notes ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="创建时间">
        {formatDate(fabric.createdAt)}
      </Descriptions.Item>
      <Descriptions.Item label="更新时间">
        {formatDate(fabric.updatedAt)}
      </Descriptions.Item>
    </Descriptions>
  );
}
