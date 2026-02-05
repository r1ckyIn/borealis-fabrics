/**
 * Debounce hooks for search inputs and callbacks.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const DEFAULT_DELAY = 300;

/**
 * Debounce a value. Returns the debounced value after the specified delay.
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = DEFAULT_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function.
 * @param callback - The callback to debounce
 * @param delay - The delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = DEFAULT_DELAY
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  return debouncedCallback;
}

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
}

interface UseDebouncedSearchReturn {
  searchValue: string;
  debouncedValue: string;
  setSearchValue: (value: string) => void;
  clearSearch: () => void;
}

/**
 * A specialized hook for search inputs with debouncing.
 * @param initialValue - Initial search value
 * @param options - Configuration options
 * @returns Search state and handlers
 */
export function useDebouncedSearch(
  initialValue: string = '',
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const { delay = DEFAULT_DELAY, minLength = 0 } = options;
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedValue = useDebounce(searchValue, delay);

  // Only return debounced value if it meets minimum length requirement
  const effectiveValue = useMemo(() => {
    return debouncedValue.length >= minLength ? debouncedValue : '';
  }, [debouncedValue, minLength]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  return {
    searchValue,
    debouncedValue: effectiveValue,
    setSearchValue,
    clearSearch,
  };
}
