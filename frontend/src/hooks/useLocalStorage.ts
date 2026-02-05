/**
 * Local storage hook with type safety and cross-tab synchronization.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Check if localStorage is available (SSR safety).
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a JSON value from localStorage safely.
 */
function parseStoredValue<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type SetValue<T> = T | ((prev: T) => T);

/**
 * A hook for persisting state to localStorage with type safety.
 * Supports cross-tab synchronization via the storage event.
 *
 * @param key - The localStorage key
 * @param initialValue - The initial/fallback value
 * @returns A tuple of [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isLocalStorageAvailable()) {
      return initialValue;
    }

    const item = window.localStorage.getItem(key);
    return parseStoredValue(item, initialValue);
  });

  /**
   * Set value in state and localStorage.
   */
  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;

        if (isLocalStorageAvailable()) {
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          } catch (error) {
            console.warn(`Failed to save to localStorage (key: ${key}):`, error);
          }
        }

        return newValue;
      });
    },
    [key]
  );

  /**
   * Remove value from state and localStorage.
   */
  const removeValue = useCallback(() => {
    setStoredValue(initialValue);

    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove from localStorage (key: ${key}):`, error);
      }
    }
  }, [key, initialValue]);

  /**
   * Listen for storage events to sync across tabs.
   */
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        setStoredValue(parseStoredValue(event.newValue, initialValue));
      } else if (event.key === key && event.newValue === null) {
        // Key was removed in another tab
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Get a value from localStorage without subscribing to changes.
 * Useful for one-time reads.
 */
export function getLocalStorageValue<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable()) {
    return fallback;
  }

  const item = window.localStorage.getItem(key);
  return parseStoredValue(item, fallback);
}

/**
 * Set a value in localStorage without using a hook.
 */
export function setLocalStorageValue<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save to localStorage (key: ${key}):`, error);
  }
}

/**
 * Remove a value from localStorage without using a hook.
 */
export function removeLocalStorageValue(key: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove from localStorage (key: ${key}):`, error);
  }
}
