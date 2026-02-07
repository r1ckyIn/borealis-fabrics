import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

// Mock react-router-dom useSearchParams
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  describe('default state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePagination());

      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(20);
      expect(result.current.sortBy).toBeUndefined();
      expect(result.current.sortOrder).toBe('desc');
    });

    it('should accept custom defaults', () => {
      const { result } = renderHook(() =>
        usePagination({
          defaultPage: 2,
          defaultPageSize: 50,
          defaultSortBy: 'name',
          defaultSortOrder: 'asc',
        })
      );

      expect(result.current.page).toBe(2);
      expect(result.current.pageSize).toBe(50);
      expect(result.current.sortBy).toBe('name');
      expect(result.current.sortOrder).toBe('asc');
    });
  });

  describe('setPage', () => {
    it('should update page number', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.setPage(3);
      });

      expect(result.current.page).toBe(3);
    });
  });

  describe('setPageSize', () => {
    it('should update page size and reset to page 1', () => {
      const { result } = renderHook(() => usePagination());

      // First go to page 3
      act(() => {
        result.current.setPage(3);
      });
      expect(result.current.page).toBe(3);

      // Then change page size - should reset to page 1
      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pageSize).toBe(50);
      expect(result.current.page).toBe(1);
    });
  });

  describe('setSort', () => {
    it('should update sort field and order', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.setSort('name', 'asc');
      });

      expect(result.current.sortBy).toBe('name');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('should reset page to 1 when sorting', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.setPage(5);
      });

      act(() => {
        result.current.setSort('createdAt', 'desc');
      });

      expect(result.current.page).toBe(1);
    });
  });

  describe('resetPagination', () => {
    it('should reset all values to defaults', () => {
      const { result } = renderHook(() =>
        usePagination({ defaultPageSize: 10 })
      );

      act(() => {
        result.current.setPage(5);
        result.current.setPageSize(50);
        result.current.setSort('name', 'asc');
      });

      act(() => {
        result.current.resetPagination();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.sortBy).toBeUndefined();
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('paginationProps', () => {
    it('should return Ant Design compatible pagination config', () => {
      const { result } = renderHook(() => usePagination());

      const props = result.current.paginationProps;
      expect(props.current).toBe(1);
      expect(props.pageSize).toBe(20);
      expect(props.showSizeChanger).toBe(true);
      expect(props.showQuickJumper).toBe(true);
      expect(typeof props.showTotal).toBe('function');
    });

    it('should format total text correctly', () => {
      const { result } = renderHook(() => usePagination());

      const showTotal = result.current.paginationProps.showTotal!;
      expect(showTotal(100, [1, 20])).toBe('1-20 / \u5171 100 \u6761');
    });
  });

  describe('queryParams', () => {
    it('should return query params for API calls', () => {
      const { result } = renderHook(() => usePagination());

      expect(result.current.queryParams).toEqual({
        page: 1,
        pageSize: 20,
        sortBy: undefined,
        sortOrder: 'desc',
      });
    });

    it('should reflect current state', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.setSort('createdAt', 'asc');
      });

      // setSort resets page to 1
      expect(result.current.queryParams.page).toBe(1);
      expect(result.current.queryParams.sortBy).toBe('createdAt');
      expect(result.current.queryParams.sortOrder).toBe('asc');

      act(() => {
        result.current.setPage(3);
      });

      expect(result.current.queryParams.page).toBe(3);
    });
  });

  describe('handleTableChange', () => {
    it('should update pagination from table change', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.handleTableChange(
          { current: 2, pageSize: 50 },
          {},
          {}
        );
      });

      expect(result.current.page).toBe(2);
      expect(result.current.pageSize).toBe(50);
    });

    it('should update sort from table sorter', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.handleTableChange(
          { current: 1, pageSize: 20 },
          {},
          { field: 'name', order: 'ascend' }
        );
      });

      expect(result.current.sortBy).toBe('name');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('should handle descend sort order', () => {
      const { result } = renderHook(() => usePagination());

      act(() => {
        result.current.handleTableChange(
          { current: 1, pageSize: 20 },
          {},
          { field: 'createdAt', order: 'descend' }
        );
      });

      expect(result.current.sortBy).toBe('createdAt');
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('URL sync mode', () => {
    it('should call setSearchParams when syncWithUrl is true', () => {
      const { result } = renderHook(() =>
        usePagination({ syncWithUrl: true })
      );

      act(() => {
        result.current.setPage(3);
      });

      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });
});
