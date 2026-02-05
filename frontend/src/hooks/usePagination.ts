/**
 * Pagination hook with URL synchronization support.
 */

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TablePaginationConfig } from 'antd';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_ORDER = 'desc' as const;

type SortOrder = 'asc' | 'desc';

interface UsePaginationOptions {
  /** Initial page number (default: 1) */
  defaultPage?: number;
  /** Initial page size (default: 20) */
  defaultPageSize?: number;
  /** Default sort field */
  defaultSortBy?: string;
  /** Default sort order (default: 'desc') */
  defaultSortOrder?: SortOrder;
  /** Sync pagination state with URL search params */
  syncWithUrl?: boolean;
  /** Available page size options */
  pageSizeOptions?: number[];
}

interface UsePaginationReturn {
  /** Current page number (1-based) */
  page: number;
  /** Current page size */
  pageSize: number;
  /** Current sort field */
  sortBy: string | undefined;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Set page number */
  setPage: (page: number) => void;
  /** Set page size (resets to page 1) */
  setPageSize: (size: number) => void;
  /** Set sort field and order */
  setSort: (field: string, order: SortOrder) => void;
  /** Reset pagination to defaults */
  resetPagination: () => void;
  /** Props object for Ant Design Table pagination */
  paginationProps: TablePaginationConfig;
  /** Query params object for API calls */
  queryParams: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder: SortOrder;
  };
  /** Handle Ant Design table pagination change */
  handleTableChange: (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: { field?: string; order?: 'ascend' | 'descend' } | unknown[]
  ) => void;
}

/**
 * Parse page number from string, with validation.
 */
function parsePageNumber(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

/**
 * Parse page size from string, with validation against allowed options.
 */
function parsePageSize(
  value: string | null,
  defaultValue: number,
  options: number[]
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return options.includes(parsed) ? parsed : defaultValue;
}

/**
 * Parse sort order from string.
 */
function parseSortOrder(value: string | null, defaultValue: SortOrder): SortOrder {
  if (value === 'asc' || value === 'desc') return value;
  return defaultValue;
}

/**
 * A hook for managing table pagination with optional URL synchronization.
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    defaultPage = DEFAULT_PAGE,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    defaultSortBy,
    defaultSortOrder = DEFAULT_SORT_ORDER,
    syncWithUrl = false,
    pageSizeOptions = [10, 20, 50, 100],
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Internal state (used when not syncing with URL)
  const [internalState, setInternalState] = useState({
    page: defaultPage,
    pageSize: defaultPageSize,
    sortBy: defaultSortBy,
    sortOrder: defaultSortOrder,
  });

  // Get current values based on sync mode
  const currentValues = useMemo(() => {
    if (!syncWithUrl) {
      return internalState;
    }

    return {
      page: parsePageNumber(searchParams.get('page'), defaultPage),
      pageSize: parsePageSize(searchParams.get('pageSize'), defaultPageSize, pageSizeOptions),
      sortBy: searchParams.get('sortBy') || defaultSortBy,
      sortOrder: parseSortOrder(searchParams.get('sortOrder'), defaultSortOrder),
    };
  }, [
    syncWithUrl,
    searchParams,
    defaultPage,
    defaultPageSize,
    defaultSortBy,
    defaultSortOrder,
    pageSizeOptions,
    internalState,
  ]);

  /**
   * Update URL params while preserving existing params.
   */
  const updateUrlParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            newParams.set(key, value);
          } else {
            newParams.delete(key);
          }
        });
        return newParams;
      });
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (page: number) => {
      if (syncWithUrl) {
        updateUrlParams({ page: String(page) });
      } else {
        setInternalState((prev) => ({ ...prev, page }));
      }
    },
    [syncWithUrl, updateUrlParams]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (syncWithUrl) {
        // Reset to page 1 when changing page size
        updateUrlParams({ page: '1', pageSize: String(pageSize) });
      } else {
        setInternalState((prev) => ({ ...prev, page: 1, pageSize }));
      }
    },
    [syncWithUrl, updateUrlParams]
  );

  const setSort = useCallback(
    (sortBy: string, sortOrder: SortOrder) => {
      if (syncWithUrl) {
        updateUrlParams({ sortBy, sortOrder, page: '1' });
      } else {
        setInternalState((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
      }
    },
    [syncWithUrl, updateUrlParams]
  );

  const resetPagination = useCallback(() => {
    if (syncWithUrl) {
      updateUrlParams({
        page: undefined,
        pageSize: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    } else {
      setInternalState({
        page: defaultPage,
        pageSize: defaultPageSize,
        sortBy: defaultSortBy,
        sortOrder: defaultSortOrder,
      });
    }
  }, [
    syncWithUrl,
    updateUrlParams,
    defaultPage,
    defaultPageSize,
    defaultSortBy,
    defaultSortOrder,
  ]);

  /**
   * Handle Ant Design table pagination/sorting change.
   */
  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: { field?: string; order?: 'ascend' | 'descend' } | unknown[]
    ) => {
      const newPage = pagination.current || defaultPage;
      const newPageSize = pagination.pageSize || defaultPageSize;

      // Handle sorter (can be an array for multi-column sort, we only support single)
      const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      const typedSorter = singleSorter as { field?: string; order?: 'ascend' | 'descend' };

      let newSortBy = currentValues.sortBy;
      let newSortOrder = currentValues.sortOrder;

      if (typedSorter?.field) {
        newSortBy = String(typedSorter.field);
        newSortOrder = typedSorter.order === 'ascend' ? 'asc' : 'desc';
      } else if (!typedSorter?.order) {
        // Sort was cleared
        newSortBy = defaultSortBy;
        newSortOrder = defaultSortOrder;
      }

      if (syncWithUrl) {
        updateUrlParams({
          page: String(newPage),
          pageSize: String(newPageSize),
          sortBy: newSortBy,
          sortOrder: newSortOrder,
        });
      } else {
        setInternalState({
          page: newPage,
          pageSize: newPageSize,
          sortBy: newSortBy,
          sortOrder: newSortOrder,
        });
      }
    },
    [
      syncWithUrl,
      updateUrlParams,
      defaultPage,
      defaultPageSize,
      defaultSortBy,
      defaultSortOrder,
      currentValues.sortBy,
      currentValues.sortOrder,
    ]
  );

  // Ant Design Table pagination props
  const paginationProps = useMemo<TablePaginationConfig>(
    () => ({
      current: currentValues.page,
      pageSize: currentValues.pageSize,
      pageSizeOptions: pageSizeOptions.map(String),
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
    }),
    [currentValues.page, currentValues.pageSize, pageSizeOptions]
  );

  // Query params for API calls
  const queryParams = useMemo(
    () => ({
      page: currentValues.page,
      pageSize: currentValues.pageSize,
      sortBy: currentValues.sortBy,
      sortOrder: currentValues.sortOrder,
    }),
    [currentValues]
  );

  return {
    page: currentValues.page,
    pageSize: currentValues.pageSize,
    sortBy: currentValues.sortBy,
    sortOrder: currentValues.sortOrder,
    setPage,
    setPageSize,
    setSort,
    resetPagination,
    paginationProps,
    queryParams,
    handleTableChange,
  };
}

/**
 * Default export for convenience.
 */
export default usePagination;
