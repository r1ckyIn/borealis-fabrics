/**
 * Tests for authStore (cookie-based auth, no token stored client-side).
 */

import type { AuthUser } from '@/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../authStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('authStore', () => {
  const mockUser: AuthUser = {
    id: 1,
    weworkId: 'wework-123',
    name: 'Test User',
    avatar: 'https://example.com/avatar.png',
    mobile: '13800138000',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should mark as authenticated after setting user', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(true);
    });

    it('should set isInitializing to false', () => {
      useAuthStore.setState({ isInitializing: true });
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
    });

    it('should allow setting user to null', () => {
      useAuthStore.setState({ user: mockUser });

      const { setUser } = useAuthStore.getState();
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear user', () => {
      useAuthStore.setState({ user: mockUser });

      const { clearAuth } = useAuthStore.getState();
      clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should mark as not authenticated after clearing', () => {
      useAuthStore.setState({ user: mockUser });

      const { clearAuth } = useAuthStore.getState();
      clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });

  describe('setInitializing', () => {
    it('should set isInitializing to true', () => {
      const { setInitializing } = useAuthStore.getState();
      setInitializing(true);

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(true);
    });

    it('should set isInitializing to false', () => {
      useAuthStore.setState({ isInitializing: true });

      const { setInitializing } = useAuthStore.getState();
      setInitializing(false);

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user exists', () => {
      useAuthStore.setState({ user: mockUser });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(true);
    });

    it('should return false when user is null', () => {
      useAuthStore.setState({ user: null });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });
});
