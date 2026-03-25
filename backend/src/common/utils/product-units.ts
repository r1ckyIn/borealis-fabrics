import { ProductSubCategory } from '../../system/enums';

/**
 * Default unit for fabric items.
 */
export const FABRIC_UNIT = 'meter';

/**
 * Unit mapping by product sub-category.
 */
export const UNIT_BY_SUB_CATEGORY: Record<string, string> = {
  [ProductSubCategory.IRON_FRAME]: 'set',
  [ProductSubCategory.MOTOR]: 'piece',
  [ProductSubCategory.MATTRESS]: 'sheet',
  [ProductSubCategory.ACCESSORY]: 'piece',
};

/**
 * Derive unit string from product sub-category.
 * Falls back to 'piece' for unknown sub-categories.
 */
export function getUnitForProduct(subCategory: string): string {
  return UNIT_BY_SUB_CATEGORY[subCategory] ?? 'piece';
}
