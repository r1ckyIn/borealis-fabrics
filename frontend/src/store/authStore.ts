/**
 * Authentication store for managing user state.
 *
 * JWT is stored in HttpOnly cookies (set by backend).
 * This store only holds the user object for UI display.
 * Uses Zustand with persist middleware to cache user data in localStorage.
 */

import type { AuthUser } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/utils/constants';

export interface AuthState {
  /** Current authenticated user, null if not logged in. */
  user: AuthUser | null;
  /** Whether authentication state is being initialized. */
  isInitializing: boolean;
}

export interface AuthActions {
  /** Set user from login/OAuth response. */
  setUser: (user: AuthUser | null) => void;
  /** Clear all auth data on logout. */
  clearAuth: () => void;
  /** Set initialization status. */
  setInitializing: (initializing: boolean) => void;
  /** Check if user is authenticated. */
  isAuthenticated: () => boolean;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isInitializing: true,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({ user, isInitializing: false });
      },

      clearAuth: () => {
        set({ user: null, isInitializing: false });
      },

      setInitializing: (isInitializing) => {
        set({ isInitializing });
      },

      isAuthenticated: () => {
        const { user } = get();
        return user !== null;
      },
    }),
    {
      name: STORAGE_KEYS.AUTH,
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark initialization as complete after rehydration
        if (state) {
          state.setInitializing(false);
        }
      },
    }
  )
);

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.user !== null);
export const useIsInitializing = () =>
  useAuthStore((state) => state.isInitializing);
