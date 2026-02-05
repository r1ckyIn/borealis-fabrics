/**
 * Enum store for caching system enums.
 *
 * Fetches and caches enum definitions from the backend on app initialization.
 * Provides helper functions to get labels for enum values.
 */

import type { EnumDefinition, SystemEnumsResponse } from '@/types';
import { create } from 'zustand';

import { systemApi } from '@/api';

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

export const useEnumStore = create<EnumStore>()((set, get) => ({
  ...initialState,

  fetchEnums: async () => {
    const state = get();
    // Skip if already loaded or currently loading
    if (state.isLoaded || state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const enums = await systemApi.getEnums();
      set({
        enums,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch enums';
      set({
        isLoading: false,
        error: message,
      });
      console.error('Failed to fetch enums:', error);
    }
  },

  refetchEnums: async () => {
    set({ isLoading: true, isLoaded: false, error: null });

    try {
      const enums = await systemApi.getEnums();
      set({
        enums,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch enums';
      set({
        isLoading: false,
        error: message,
      });
      console.error('Failed to refetch enums:', error);
    }
  },

  getLabel: (enumName: keyof SystemEnumsResponse, value: string): string => {
    const state = get();
    if (!state.enums) {
      return value;
    }
    const enumDef = state.enums[enumName];
    if (!enumDef) {
      return value;
    }
    return enumDef.labels[value] ?? value;
  },

  getValues: (enumName: keyof SystemEnumsResponse): string[] => {
    const state = get();
    if (!state.enums) {
      return [];
    }
    const enumDef = state.enums[enumName];
    return enumDef?.values ?? [];
  },

  getEnumDefinition: (
    enumName: keyof SystemEnumsResponse
  ): EnumDefinition | null => {
    const state = get();
    if (!state.enums) {
      return null;
    }
    return state.enums[enumName] ?? null;
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
