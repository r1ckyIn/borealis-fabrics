/**
 * Hooks module exports.
 */

// Utility hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
} from './useDebounce';

export {
  useLocalStorage,
  getLocalStorageValue,
  setLocalStorageValue,
  removeLocalStorageValue,
} from './useLocalStorage';

export { usePagination } from './usePagination';

// Query hooks
export * from './queries';
