/**
 * Store exports for Borealis Fabrics frontend.
 *
 * Re-exports all Zustand stores and their selector hooks.
 */

// Auth store
export {
  useAuthStore,
  useIsAuthenticated,
  useIsInitializing,
  useUser,
} from './authStore';
export type { AuthActions, AuthState, AuthStore } from './authStore';

// UI store
export {
  useGlobalLoading,
  useLoadingMessage,
  useSidebarCollapsed,
  useUIStore,
} from './uiStore';
export type { UIActions, UIState, UIStore } from './uiStore';

// Enum store
export {
  useEnums,
  useEnumsError,
  useEnumsLoaded,
  useEnumsLoading,
  useEnumStore,
} from './enumStore';
export type { EnumActions, EnumState, EnumStore } from './enumStore';
