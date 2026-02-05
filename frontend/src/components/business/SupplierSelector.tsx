/**
 * Supplier selector component with search support.
 * Uses debounced search and displays supplier info.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Spin, Empty, Tag } from 'antd';
import type { SelectProps } from 'antd';

import type { Supplier } from '@/types/entities.types';
import { SupplierStatus } from '@/types/enums.types';

export interface SupplierSelectorProps {
  /** Selected supplier ID (controlled mode) */
  value?: number;
  /** Callback when selection changes */
  onChange?: (id: number | undefined, supplier?: Supplier) => void;
  /** Disable selection */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Search callback provided by parent */
  onSearch: (keyword: string) => Promise<Supplier[]>;
  /** Allow clearing selection */
  allowClear?: boolean;
  /** Custom style */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
}

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

/** Supplier status display config */
const STATUS_CONFIG: Record<SupplierStatus, { color: string; label: string }> = {
  [SupplierStatus.ACTIVE]: { color: 'green', label: '正常' },
  [SupplierStatus.SUSPENDED]: { color: 'orange', label: '暂停' },
  [SupplierStatus.ELIMINATED]: { color: 'red', label: '淘汰' },
};

/**
 * Format supplier option label.
 */
function formatSupplierLabel(supplier: Supplier): string {
  const contactInfo = supplier.contactName ? ` (${supplier.contactName})` : '';
  return `${supplier.companyName}${contactInfo}`;
}

export function SupplierSelector({
  value,
  onChange,
  disabled = false,
  placeholder = '请选择供应商',
  onSearch,
  allowClear = true,
  style,
  className,
}: SupplierSelectorProps): React.ReactElement {
  const [options, setOptions] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store supplier map for lookup
  const supplierMapRef = useRef<Map<number, Supplier>>(new Map());

  /**
   * Fetch suppliers based on search keyword.
   */
  const fetchSuppliers = useCallback(
    async (keyword: string): Promise<void> => {
      setLoading(true);
      try {
        const results = await onSearch(keyword);
        setOptions(results);
        // Update supplier map
        results.forEach((supplier) => {
          supplierMapRef.current.set(supplier.id, supplier);
        });
      } catch (error) {
        console.error('Failed to fetch suppliers:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch]
  );

  /**
   * Handle search with debounce.
   */
  const handleSearch = useCallback(
    (keyword: string): void => {
      setSearchValue(keyword);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        fetchSuppliers(keyword);
      }, DEBOUNCE_DELAY);
    },
    [fetchSuppliers]
  );

  /**
   * Handle selection change.
   */
  const handleChange = (selectedId: number | undefined): void => {
    if (selectedId === undefined) {
      onChange?.(undefined, undefined);
    } else {
      const supplier = supplierMapRef.current.get(selectedId);
      onChange?.(selectedId, supplier);
    }
  };

  /**
   * Load initial options when component mounts.
   */
  useEffect(() => {
    fetchSuppliers('');
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchSuppliers]);

  const selectOptions: SelectProps['options'] = options.map((supplier) => ({
    value: supplier.id,
    label: formatSupplierLabel(supplier),
    supplier,
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
      className={className}
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
        const supplier = option.data.supplier as Supplier;
        const statusConfig = STATUS_CONFIG[supplier.status];
        return (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium">{supplier.companyName}</span>
              {supplier.contactName && (
                <span className="text-gray-500 text-sm">
                  联系人: {supplier.contactName}
                  {supplier.phone && ` | ${supplier.phone}`}
                </span>
              )}
            </div>
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </div>
        );
      }}
    />
  );
}

export default SupplierSelector;
