import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useDebouncedSearch } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    // Update value
    rerender({ value: 'world', delay: 300 });

    // Should still be old value before delay
    expect(result.current).toBe('hello');

    // Advance time past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('should reset timer on rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Rapid updates
    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'abcd' });

    // Still showing initial value
    expect(result.current).toBe('a');

    // Advance past delay from last update
    act(() => { vi.advanceTimersByTime(300); });

    // Should show final value
    expect(result.current).toBe('abcd');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Not yet at 300ms
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    // At 300ms
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timer on unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });

    // Unmount before timer fires
    unmount();

    // Advance time - should not cause errors
    act(() => { vi.advanceTimersByTime(300); });

    // No assertion needed - if cleanup failed, unmount would cause issues
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call multiple times
    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });

    // Callback not called yet
    expect(callback).not.toHaveBeenCalled();

    // Advance past delay
    act(() => { vi.advanceTimersByTime(300); });

    // Called once with last args
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('c');
  });

  it('should cleanup timer on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 300)
    );

    act(() => {
      result.current('test');
    });

    unmount();

    act(() => { vi.advanceTimersByTime(300); });

    // Should not have been called after unmount
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty string by default', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    expect(result.current.searchValue).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });

  it('should initialize with provided value', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial'));

    expect(result.current.searchValue).toBe('initial');
  });

  it('should update searchValue immediately and debounce debouncedValue', () => {
    const { result } = renderHook(() => useDebouncedSearch('', { delay: 300 }));

    act(() => {
      result.current.setSearchValue('test');
    });

    // searchValue updates immediately
    expect(result.current.searchValue).toBe('test');
    // debouncedValue still empty
    expect(result.current.debouncedValue).toBe('');

    act(() => { vi.advanceTimersByTime(300); });

    // Now debouncedValue is updated
    expect(result.current.debouncedValue).toBe('test');
  });

  it('should respect minLength option', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch('', { delay: 300, minLength: 3 })
    );

    act(() => {
      result.current.setSearchValue('ab');
    });
    act(() => { vi.advanceTimersByTime(300); });

    // Below minLength - should return empty
    expect(result.current.debouncedValue).toBe('');

    act(() => {
      result.current.setSearchValue('abc');
    });
    act(() => { vi.advanceTimersByTime(300); });

    // Meets minLength
    expect(result.current.debouncedValue).toBe('abc');
  });

  it('should clear search value', () => {
    const { result } = renderHook(() => useDebouncedSearch('hello'));

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchValue).toBe('');
  });
});
