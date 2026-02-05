/**
 * Authentication store for managing JWT tokens and user state.
 *
 * Uses Zustand with persist middleware to store auth data in localStorage.
 */

import type { AuthUser, LoginResponse } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/utils/constants';

export interface AuthState {
  /** Current authenticated user, null if not logged in. */
  user: AuthUser | null;
  /** JWT token for API authentication. */
  token: string | null;
  /** Whether authentication state is being initialized. */
  isInitializing: boolean;
}

export interface AuthActions {
  /** Set auth data from login response. */
  setAuth: (response: LoginResponse) => void;
  /** Clear all auth data on logout. */
  clearAuth: () => void;
  /** Update user information. */
  setUser: (user: AuthUser | null) => void;
  /** Set initialization status. */
  setInitializing: (initializing: boolean) => void;
  /** Check if user is authenticated. */
  isAuthenticated: () => boolean;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isInitializing: true,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (response) => {
        set({ user: response.user, token: response.token, isInitializing: false });
      },

      clearAuth: () => {
        set({ user: null, token: null, isInitializing: false });
      },

      setUser: (user) => {
        set({ user });
      },

      setInitializing: (isInitializing) => {
        set({ isInitializing });
      },

      isAuthenticated: () => {
        const { token, user } = get();
        return token !== null && user !== null;
      },
    }),
    {
      name: STORAGE_KEYS.TOKEN,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
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
export const useToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.token !== null && state.user !== null);
export const useIsInitializing = () =>
  useAuthStore((state) => state.isInitializing);
