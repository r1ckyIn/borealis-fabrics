/**
 * UI state store for managing global UI state.
 *
 * Controls sidebar collapse state, global loading indicators, and other UI state.
 */

import { create } from 'zustand';

export interface UIState {
  /** Whether the sidebar is collapsed. */
  sidebarCollapsed: boolean;
  /** Whether a global loading indicator should be shown. */
  globalLoading: boolean;
  /** Loading message to display, if any. */
  loadingMessage: string | null;
}

export interface UIActions {
  /** Toggle sidebar collapsed state. */
  toggleSidebar: () => void;
  /** Set sidebar collapsed state directly. */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Set global loading state. */
  setGlobalLoading: (loading: boolean, message?: string | null) => void;
  /** Show loading indicator with optional message. */
  showLoading: (message?: string) => void;
  /** Hide loading indicator. */
  hideLoading: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  sidebarCollapsed: false,
  globalLoading: false,
  loadingMessage: null,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setGlobalLoading: (loading, message = null) => {
    set({ globalLoading: loading, loadingMessage: loading ? message : null });
  },

  showLoading: (message) => {
    set({ globalLoading: true, loadingMessage: message ?? null });
  },

  hideLoading: () => {
    set({ globalLoading: false, loadingMessage: null });
  },
}));

// Selector hooks for common use cases
export const useSidebarCollapsed = () =>
  useUIStore((state) => state.sidebarCollapsed);
export const useGlobalLoading = () =>
  useUIStore((state) => state.globalLoading);
export const useLoadingMessage = () =>
  useUIStore((state) => state.loadingMessage);
