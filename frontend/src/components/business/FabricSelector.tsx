/**
 * Fabric selector component with search support.
 * Uses debounced search and displays fabric info.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Spin, Empty } from 'antd';
import type { SelectProps } from 'antd';

import type { Fabric } from '@/types/entities.types';

export interface FabricSelectorProps {
  /** Selected fabric ID (controlled mode) */
  value?: number;
  /** Callback when selection changes */
  onChange?: (id: number | undefined, fabric?: Fabric) => void;
  /** Disable selection */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Search callback provided by parent */
  onSearch: (keyword: string) => Promise<Fabric[]>;
  /** Allow clearing selection */
  allowClear?: boolean;
  /** Custom style */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
}

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

/**
 * Format fabric option label.
 */
function formatFabricLabel(fabric: Fabric): string {
  return `${fabric.fabricCode} - ${fabric.name}`;
}

export function FabricSelector({
  value,
  onChange,
  disabled = false,
  placeholder = '请选择面料',
  onSearch,
  allowClear = true,
  style,
  className,
}: FabricSelectorProps): React.ReactElement {
  const [options, setOptions] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store fabric map for lookup
  const fabricMapRef = useRef<Map<number, Fabric>>(new Map());

  /**
   * Fetch fabrics based on search keyword.
   */
  const fetchFabrics = useCallback(
    async (keyword: string): Promise<void> => {
      setLoading(true);
      try {
        const results = await onSearch(keyword);
        setOptions(results);
        // Update fabric map
        results.forEach((fabric) => {
          fabricMapRef.current.set(fabric.id, fabric);
        });
      } catch (error) {
        console.error('Failed to fetch fabrics:', error);
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
        fetchFabrics(keyword);
      }, DEBOUNCE_DELAY);
    },
    [fetchFabrics]
  );

  /**
   * Handle selection change.
   */
  const handleChange = (selectedId: number | undefined): void => {
    if (selectedId === undefined) {
      onChange?.(undefined, undefined);
    } else {
      const fabric = fabricMapRef.current.get(selectedId);
      onChange?.(selectedId, fabric);
    }
  };

  /**
   * Load initial options when component mounts.
   */
  useEffect(() => {
    fetchFabrics('');
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchFabrics]);

  const selectOptions: SelectProps['options'] = options.map((fabric) => ({
    value: fabric.id,
    label: formatFabricLabel(fabric),
    fabric,
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
        const fabric = option.data.fabric as Fabric;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{fabric.fabricCode}</span>
            <span className="text-gray-500 text-sm">{fabric.name}</span>
          </div>
        );
      }}
    />
  );
}

export default FabricSelector;
