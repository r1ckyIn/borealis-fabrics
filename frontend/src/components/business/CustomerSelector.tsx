/**
 * Customer selector component with search support.
 * Uses debounced search and displays customer info.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Spin, Empty, Tag } from 'antd';
import type { SelectProps } from 'antd';

import type { Customer } from '@/types/entities.types';
import { CreditType } from '@/types/enums.types';

export interface CustomerSelectorProps {
  /** Selected customer ID (controlled mode) */
  value?: number;
  /** Callback when selection changes */
  onChange?: (id: number | undefined, customer?: Customer) => void;
  /** Disable selection */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Search callback provided by parent */
  onSearch: (keyword: string) => Promise<Customer[]>;
  /** Allow clearing selection */
  allowClear?: boolean;
  /** Custom style */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
}

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

/** Credit type display config */
const CREDIT_TYPE_CONFIG: Record<CreditType, { color: string; label: string }> = {
  [CreditType.PREPAY]: { color: 'blue', label: '预付款' },
  [CreditType.CREDIT]: { color: 'orange', label: '账期' },
};

/**
 * Format customer option label.
 */
function formatCustomerLabel(customer: Customer): string {
  const contactInfo = customer.contactName ? ` (${customer.contactName})` : '';
  return `${customer.companyName}${contactInfo}`;
}

export function CustomerSelector({
  value,
  onChange,
  disabled = false,
  placeholder = '请选择客户',
  onSearch,
  allowClear = true,
  style,
  className,
}: CustomerSelectorProps): React.ReactElement {
  const [options, setOptions] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store customer map for lookup
  const customerMapRef = useRef<Map<number, Customer>>(new Map());

  /**
   * Fetch customers based on search keyword.
   */
  const fetchCustomers = useCallback(
    async (keyword: string): Promise<void> => {
      setLoading(true);
      try {
        const results = await onSearch(keyword);
        setOptions(results);
        // Update customer map
        results.forEach((customer) => {
          customerMapRef.current.set(customer.id, customer);
        });
      } catch (error) {
        console.error('Failed to fetch customers:', error);
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
        fetchCustomers(keyword);
      }, DEBOUNCE_DELAY);
    },
    [fetchCustomers]
  );

  /**
   * Handle selection change.
   */
  const handleChange = (selectedId: number | undefined): void => {
    if (selectedId === undefined) {
      onChange?.(undefined, undefined);
    } else {
      const customer = customerMapRef.current.get(selectedId);
      onChange?.(selectedId, customer);
    }
  };

  /**
   * Load initial options when component mounts.
   */
  useEffect(() => {
    fetchCustomers('');
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchCustomers]);

  const selectOptions: SelectProps['options'] = options.map((customer) => ({
    value: customer.id,
    label: formatCustomerLabel(customer),
    customer,
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
        const customer = option.data.customer as Customer;
        const creditConfig = CREDIT_TYPE_CONFIG[customer.creditType];
        return (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium">{customer.companyName}</span>
              {customer.contactName && (
                <span className="text-gray-500 text-sm">
                  联系人: {customer.contactName}
                  {customer.phone && ` | ${customer.phone}`}
                </span>
              )}
            </div>
            <Tag color={creditConfig.color}>{creditConfig.label}</Tag>
          </div>
        );
      }}
    />
  );
}

export default CustomerSelector;
