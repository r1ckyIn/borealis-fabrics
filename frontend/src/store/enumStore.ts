/**
 * Enum store for caching system enums.
 *
 * Fetches and caches enum definitions from the backend on app initialization.
 * Provides helper functions to get labels for enum values.
 */

import type { EnumDefinition, SystemEnumsResponse } from '@/types';
import { create } from 'zustand';

import { systemApi } from '@/api';
import { logger } from '@/utils/logger';

export interface EnumState {
  /** Cached enum definitions. */
  enums: SystemEnumsResponse | null;
  /** Whether enums are currently being loaded. */
  isLoading: boolean;
  /** Whether enums have been successfully loaded. */
  isLoaded: boolean;
  /** Error message if fetch failed. */
  error: string | null;
}

export interface EnumActions {
  /** Fetch enums from the backend. Skips if already loaded or loading. */
  fetchEnums: () => Promise<void>;
  /** Force refetch enums, ignoring cache. */
  refetchEnums: () => Promise<void>;
  /** Get label for a specific enum value. */
  getLabel: (enumName: keyof SystemEnumsResponse, value: string) => string;
  /** Get all values for a specific enum. */
  getValues: (enumName: keyof SystemEnumsResponse) => string[];
  /** Get enum definition by name. */
  getEnumDefinition: (
    enumName: keyof SystemEnumsResponse
  ) => EnumDefinition | null;
  /** Reset enum store to initial state. */
  reset: () => void;
}

export type EnumStore = EnumState & EnumActions;

const initialState: EnumState = {
  enums: null,
  isLoading: false,
  isLoaded: false,
  error: null,
};

/**
 * Internal helper to perform the actual fetch operation.
 */
async function performFetch(
  set: (state: Partial<EnumState>) => void
): Promise<void> {
  try {
    const enums = await systemApi.getEnums();
    set({ enums, isLoaded: true, isLoading: false, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch enums';
    set({ isLoading: false, error: message });
    logger.error('Failed to fetch enums', error);
  }
}

export const useEnumStore = create<EnumStore>()((set, get) => ({
  ...initialState,

  fetchEnums: async () => {
    const { isLoaded, isLoading } = get();
    if (isLoaded || isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    await performFetch(set);
  },

  refetchEnums: async () => {
    set({ isLoading: true, isLoaded: false, error: null });
    await performFetch(set);
  },

  getLabel: (enumName, value) => {
    const enumDef = get().enums?.[enumName];
    return enumDef?.labels[value] ?? value;
  },

  getValues: (enumName) => {
    return get().enums?.[enumName]?.values ?? [];
  },

  getEnumDefinition: (enumName) => {
    return get().enums?.[enumName] ?? null;
  },

  reset: () => {
    set(initialState);
  },
}));

// Selector hooks for common use cases
export const useEnums = () => useEnumStore((state) => state.enums);
export const useEnumsLoading = () => useEnumStore((state) => state.isLoading);
export const useEnumsLoaded = () => useEnumStore((state) => state.isLoaded);
export const useEnumsError = () => useEnumStore((state) => state.error);
