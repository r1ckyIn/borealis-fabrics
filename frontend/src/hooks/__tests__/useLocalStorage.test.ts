import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLocalStorage,
  getLocalStorageValue,
  setLocalStorageValue,
  removeLocalStorageValue,
} from '../useLocalStorage';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useLocalStorage', () => {
  describe('initialization', () => {
    it('should return initial value when localStorage is empty', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('should return stored value from localStorage', () => {
      localStorage.setItem('key', JSON.stringify('stored'));
      const { result } = renderHook(() => useLocalStorage('key', 'default'));
      expect(result.current[0]).toBe('stored');
    });

    it('should handle complex objects', () => {
      const obj = { name: 'test', count: 42 };
      localStorage.setItem('obj', JSON.stringify(obj));
      const { result } = renderHook(() =>
        useLocalStorage('obj', { name: '', count: 0 })
      );
      expect(result.current[0]).toEqual(obj);
    });

    it('should return initial value when stored JSON is invalid', () => {
      localStorage.setItem('key', 'not-valid-json{');
      const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });
  });

  describe('setValue', () => {
    it('should update state and localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated');
    });

    it('should support function updater', () => {
      const { result } = renderHook(() => useLocalStorage('count', 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
      expect(JSON.parse(localStorage.getItem('count')!)).toBe(1);
    });

    it('should handle null values', () => {
      const { result } = renderHook(() =>
        useLocalStorage<string | null>('key', 'initial')
      );

      act(() => {
        result.current[1](null);
      });

      expect(result.current[0]).toBeNull();
    });

    it('should handle arrays', () => {
      const { result } = renderHook(() =>
        useLocalStorage<string[]>('list', [])
      );

      act(() => {
        result.current[1](['a', 'b', 'c']);
      });

      expect(result.current[0]).toEqual(['a', 'b', 'c']);
      expect(JSON.parse(localStorage.getItem('list')!)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('removeValue', () => {
    it('should reset to initial value and remove from localStorage', () => {
      localStorage.setItem('key', JSON.stringify('stored'));
      const { result } = renderHook(() => useLocalStorage('key', 'default'));

      expect(result.current[0]).toBe('stored');

      act(() => {
        result.current[2](); // removeValue
      });

      expect(result.current[0]).toBe('default');
      expect(localStorage.getItem('key')).toBeNull();
    });
  });

  describe('cross-tab synchronization', () => {
    it('should update when storage event fires for matching key', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'default'));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'key',
          newValue: JSON.stringify('from-other-tab'),
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('from-other-tab');
    });

    it('should reset to initial when key is removed in another tab', () => {
      localStorage.setItem('key', JSON.stringify('stored'));
      const { result } = renderHook(() => useLocalStorage('key', 'default'));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'key',
          newValue: null,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('default');
    });

    it('should ignore storage events for other keys', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'default'));

      act(() => {
        result.current[1]('my-value');
      });

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify('other-value'),
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('my-value');
    });

    it('should cleanup event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useLocalStorage('key', 'default'));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.setItem failure gracefully', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Initialize hook first (isLocalStorageAvailable needs real setItem)
      const { result } = renderHook(() => useLocalStorage('key', 'default'));

      // Mock setItem to throw only for non-test keys (allow isLocalStorageAvailable check to pass)
      const originalSetItem = Storage.prototype.setItem;
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        function (this: Storage, key: string, value: string) {
          if (key === '__localStorage_test__') {
            return originalSetItem.call(this, key, value);
          }
          throw new Error('QuotaExceeded');
        }
      );

      act(() => {
        result.current[1]('new-value');
      });

      // State still updates even if localStorage fails
      expect(result.current[0]).toBe('new-value');
      expect(warnSpy).toHaveBeenCalled();

      // Restore immediately to avoid affecting subsequent tests
      setItemSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});

describe('getLocalStorageValue', () => {
  it('should return stored value', () => {
    localStorage.setItem('key', JSON.stringify('stored'));
    expect(getLocalStorageValue('key', 'default')).toBe('stored');
  });

  it('should return fallback when key does not exist', () => {
    expect(getLocalStorageValue('missing', 'fallback')).toBe('fallback');
  });

  it('should return fallback for invalid JSON', () => {
    localStorage.setItem('key', 'invalid{json');
    expect(getLocalStorageValue('key', 'fallback')).toBe('fallback');
  });
});

describe('setLocalStorageValue', () => {
  it('should store value in localStorage', () => {
    setLocalStorageValue('key', { name: 'test' });
    expect(JSON.parse(localStorage.getItem('key')!)).toEqual({ name: 'test' });
  });
});

describe('removeLocalStorageValue', () => {
  it('should remove value from localStorage', () => {
    localStorage.setItem('key', JSON.stringify('value'));
    removeLocalStorageValue('key');
    expect(localStorage.getItem('key')).toBeNull();
  });
});
