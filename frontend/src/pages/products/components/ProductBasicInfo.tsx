/**
 * Product basic info tab content.
 * Renders product details in Ant Design Descriptions layout.
 */

import { Descriptions, Tag, Typography } from 'antd';

import { AmountDisplay } from '@/components/common/AmountDisplay';
import { formatDate } from '@/utils';
import { PRODUCT_SUB_CATEGORY_LABELS } from '@/types';
import { CATEGORY_TAG_COLORS } from '@/utils/product-constants';
import type { Product } from '@/types';

const { Text } = Typography;

export interface ProductBasicInfoProps {
  product: Product;
}

/**
 * Renders product basic information as a Descriptions component.
 * Shows common fields plus any custom specs entries.
 */
export function ProductBasicInfo({ product }: ProductBasicInfoProps): React.ReactElement {
  const subCategoryLabel =
    PRODUCT_SUB_CATEGORY_LABELS[product.subCategory as keyof typeof PRODUCT_SUB_CATEGORY_LABELS] ??
    product.subCategory;
  const tagColor = CATEGORY_TAG_COLORS[product.subCategory] ?? 'default';

  return (
    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
      <Descriptions.Item label="产品编码">
        <Text strong>{product.productCode}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="产品名称">{product.name}</Descriptions.Item>
      <Descriptions.Item label="分类">
        <Tag color={tagColor}>{subCategoryLabel}</Tag>
      </Descriptions.Item>
      {product.modelNumber && (
        <Descriptions.Item label="型号">{product.modelNumber}</Descriptions.Item>
      )}
      {product.specification && (
        <Descriptions.Item label="规格">{product.specification}</Descriptions.Item>
      )}
      <Descriptions.Item label="默认单价">
        <AmountDisplay value={product.defaultPrice} />
      </Descriptions.Item>
      {/* Render custom specs if present */}
      {product.specs && Object.entries(product.specs).length > 0 && (
        <>
          {Object.entries(product.specs).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {String(value ?? '-')}
            </Descriptions.Item>
          ))}
        </>
      )}
      <Descriptions.Item label="备注" span={3}>
        {product.notes ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item label="创建时间">
        {formatDate(product.createdAt)}
      </Descriptions.Item>
      <Descriptions.Item label="更新时间">
        {formatDate(product.updatedAt)}
      </Descriptions.Item>
    </Descriptions>
  );
}
