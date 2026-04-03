/**
 * Unified product selector that searches both fabrics and products simultaneously.
 * Results include category tags and lowest-price supplier resolution.
 * Uses composite value format ("fabric:1" / "product:5") to avoid ID collisions.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Spin, Empty, Tag } from 'antd';

import { getFabrics } from '@/api/fabric.api';
import { getProducts } from '@/api/product.api';
import { getFabricSuppliers } from '@/api/fabric.api';
import { getProductSuppliers } from '@/api/product.api';
import {
  CATEGORY_TAG_COLORS,
  CATEGORY_TAG_LABELS,
  UNIT_BY_SUB_CATEGORY,
  UNIT_LABEL_FABRIC,
} from '@/utils/product-constants';
import { logger } from '@/utils/logger';

/** Result from unified search across fabrics and products. */
export interface UnifiedSearchResult {
  type: 'fabric' | 'product';
  id: number;
  code: string;
  name: string;
  subCategory?: string;
  categoryLabel: string;
  defaultPrice?: number | null;
  unit: string;
  /** Lowest-price supplier ID from FabricSupplier/ProductSupplier table */
  lowestSupplierId?: number | null;
  /** Lowest purchase price from the supplier relationship */
  lowestSupplierPrice?: number | null;
  /** Composite value for Select component — avoids ID collisions */
  compositeValue: string;
}

export interface UnifiedProductSelectorProps {
  /** Composite value ("fabric:1" or "product:5") — controlled mode */
  value?: string;
  /** Callback when selection changes, returns parsed info for parent form */
  onChange?: (
    compositeValue: string | undefined,
    result?: UnifiedSearchResult
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
}

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

/**
 * Resolve lowest-price supplier info for a single item.
 */
interface SupplierResolution {
  type: 'fabric' | 'product';
  itemId: number;
  supplierId: number | null;
  price: number | null;
}

async function resolveSupplier(
  type: 'fabric' | 'product',
  itemId: number
): Promise<SupplierResolution> {
  const fetchFn = type === 'fabric' ? getFabricSuppliers : getProductSuppliers;
  try {
    const res = await fetchFn(itemId, {
      pageSize: 1,
      sortBy: 'purchasePrice',
      sortOrder: 'asc',
    });
    return {
      type,
      itemId,
      supplierId: res.items[0]?.supplierId ?? null,
      price: res.items[0] ? Number(res.items[0].purchasePrice) : null,
    };
  } catch {
    return { type, itemId, supplierId: null, price: null };
  }
}

/**
 * Search fabrics and products in parallel, then resolve lowest-price suppliers.
 */
async function unifiedSearch(keyword: string): Promise<UnifiedSearchResult[]> {
  // Phase 1: Fetch fabrics and products in parallel
  const [fabricResult, productResult] = await Promise.allSettled([
    getFabrics({ keyword, pageSize: 10 }),
    getProducts({ keyword, pageSize: 10 }),
  ]);

  const fabricItems =
    fabricResult.status === 'fulfilled' ? fabricResult.value.items : [];
  const productItems =
    productResult.status === 'fulfilled' ? productResult.value.items : [];

  // Phase 2: Resolve lowest-price suppliers for all results in parallel
  const supplierPromises: Promise<SupplierResolution>[] = [
    ...fabricItems.map((f) => resolveSupplier('fabric', f.id)),
    ...productItems.map((p) => resolveSupplier('product', p.id)),
  ];

  const supplierResults = await Promise.all(supplierPromises);

  // Build supplier lookup maps
  const fabricSupplierMap = new Map<
    number,
    { supplierId: number | null; price: number | null }
  >();
  const productSupplierMap = new Map<
    number,
    { supplierId: number | null; price: number | null }
  >();

  for (const sr of supplierResults) {
    const map = sr.type === 'fabric' ? fabricSupplierMap : productSupplierMap;
    map.set(sr.itemId, { supplierId: sr.supplierId, price: sr.price });
  }

  // Phase 3: Assemble results with supplier data
  const results: UnifiedSearchResult[] = [];

  for (const fabric of fabricItems) {
    const supplierInfo = fabricSupplierMap.get(fabric.id);
    results.push({
      type: 'fabric',
      id: fabric.id,
      code: fabric.fabricCode,
      name: fabric.name,
      categoryLabel: CATEGORY_TAG_LABELS['fabric'],
      defaultPrice: fabric.defaultPrice,
      unit: UNIT_LABEL_FABRIC,
      lowestSupplierId: supplierInfo?.supplierId ?? null,
      lowestSupplierPrice: supplierInfo?.price ?? null,
      compositeValue: `fabric:${fabric.id}`,
    });
  }

  for (const product of productItems) {
    const supplierInfo = productSupplierMap.get(product.id);
    results.push({
      type: 'product',
      id: product.id,
      code: product.productCode,
      name: product.name,
      subCategory: product.subCategory,
      categoryLabel:
        CATEGORY_TAG_LABELS[product.subCategory] || product.subCategory,
      defaultPrice: product.defaultPrice,
      unit: UNIT_BY_SUB_CATEGORY[product.subCategory] || '个',
      lowestSupplierId: supplierInfo?.supplierId ?? null,
      lowestSupplierPrice: supplierInfo?.price ?? null,
      compositeValue: `product:${product.id}`,
    });
  }

  return results;
}

export function UnifiedProductSelector({
  value,
  onChange,
  disabled = false,
  placeholder = '搜索面料或产品',
  allowClear = true,
  style,
}: UnifiedProductSelectorProps): React.ReactElement {
  const [options, setOptions] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store result map for lookup by composite value
  const resultMapRef = useRef<Map<string, UnifiedSearchResult>>(new Map());

  /**
   * Fetch and update options from both APIs.
   */
  const fetchOptions = useCallback(async (keyword: string): Promise<void> => {
    setLoading(true);
    try {
      const results = await unifiedSearch(keyword);
      setOptions(results);
      // Replace result map (avoid unbounded growth from accumulated searches)
      resultMapRef.current = new Map(
        results.map((r) => [r.compositeValue, r])
      );
    } catch (error) {
      logger.error('Failed to fetch unified search results', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle search input with debounce.
   */
  const handleSearch = useCallback(
    (keyword: string): void => {
      setSearchValue(keyword);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        fetchOptions(keyword);
      }, DEBOUNCE_DELAY);
    },
    [fetchOptions]
  );

  /**
   * Handle selection change.
   */
  const handleChange = (selectedValue: string | undefined): void => {
    if (selectedValue) {
      const result = resultMapRef.current.get(selectedValue);
      onChange?.(selectedValue, result);
    } else {
      onChange?.(undefined, undefined);
    }
  };

  /**
   * Load initial options on mount.
   */
  useEffect(() => {
    fetchOptions('');
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchOptions]);

  const selectOptions = options.map((r) => ({
    value: r.compositeValue,
    label: `${r.code} - ${r.name}`,
    result: r,
  }));

  return (
    <Select
      value={value}
      onChange={handleChange}
      onSearch={handleSearch}
      disabled={disabled}
      placeholder={placeholder}
      allowClear={allowClear}
      showSearch
      filterOption={false}
      loading={loading}
      style={style}
      searchValue={searchValue}
      options={selectOptions}
      notFoundContent={
        loading ? (
          <Spin size="small" />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
        )
      }
      optionRender={(option) => {
        const result = option.data.result as UnifiedSearchResult;
        const tagColor =
          CATEGORY_TAG_COLORS[result.subCategory || result.type] || 'default';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{result.code}</span>
            <span className="text-gray-500 text-sm">
              {result.name}{' '}
              <Tag color={tagColor} style={{ marginLeft: 4 }}>
                {result.categoryLabel}
              </Tag>
            </span>
          </div>
        );
      }}
    />
  );
}

export default UnifiedProductSelector;
