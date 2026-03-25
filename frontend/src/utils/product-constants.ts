/**
 * Product category constants, route mappings, unit mappings,
 * and tag configurations for multi-category product support.
 */

/** Map URL route segments to backend ProductSubCategory enum values. */
export const CATEGORY_ROUTE_MAP: Record<string, string> = {
  'iron-frames': 'IRON_FRAME',
  'motors': 'MOTOR',
  'mattresses': 'MATTRESS',
  'accessories': 'ACCESSORY',
};

/** Reverse map: backend ProductSubCategory to URL route segments. */
export const SUB_CATEGORY_ROUTE_MAP: Record<string, string> = {
  IRON_FRAME: 'iron-frames',
  MOTOR: 'motors',
  MATTRESS: 'mattresses',
  ACCESSORY: 'accessories',
};

/** Default unit of measurement by product sub-category. */
export const UNIT_BY_SUB_CATEGORY: Record<string, string> = {
  IRON_FRAME: '套',
  MOTOR: '个',
  MATTRESS: '张',
  ACCESSORY: '个',
};

/** Default unit for fabric items. */
export const UNIT_LABEL_FABRIC = '米';

/**
 * Determine the unit of measurement for an order/quote item.
 * Fabric items use meters (米), products use their sub-category default.
 */
export function getItemUnit(
  fabricId?: number | null,
  subCategory?: string
): string {
  if (fabricId) return UNIT_LABEL_FABRIC;
  if (subCategory && UNIT_BY_SUB_CATEGORY[subCategory]) {
    return UNIT_BY_SUB_CATEGORY[subCategory];
  }
  return '个';
}

/** Tag colors per category for Ant Design Tag component. */
export const CATEGORY_TAG_COLORS: Record<string, string> = {
  fabric: 'blue',
  IRON_FRAME: 'orange',
  MOTOR: 'green',
  MATTRESS: 'purple',
  ACCESSORY: 'cyan',
};

/** Chinese labels per category for display in tags and selectors. */
export const CATEGORY_TAG_LABELS: Record<string, string> = {
  fabric: '面料',
  IRON_FRAME: '铁架',
  MOTOR: '电机',
  MATTRESS: '床垫',
  ACCESSORY: '配件',
};

/**
 * Parse a composite value string ("fabric:1" / "product:5") into type and id.
 * Returns null if the value is invalid.
 */
export function parseCompositeValue(
  value: string
): { type: 'fabric' | 'product'; id: number } | null {
  const [type, idStr] = value.split(':');
  const id = parseInt(idStr, 10);
  if ((type === 'fabric' || type === 'product') && !isNaN(id)) {
    return { type: type as 'fabric' | 'product', id };
  }
  return null;
}
