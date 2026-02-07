/**
 * Tests for authStore.
 */

import type { AuthUser, LoginResponse } from '@/types';
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

  const mockLoginResponse: LoginResponse = {
    token: 'mock-jwt-token',
    user: mockUser,
  };

  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isInitializing: false,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null token initially', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set user and token from login response', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(mockLoginResponse);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('mock-jwt-token');
    });

    it('should mark as authenticated after setting auth', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(mockLoginResponse);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(true);
    });

    it('should set isInitializing to false', () => {
      useAuthStore.setState({ isInitializing: true });
      const { setAuth } = useAuthStore.getState();
      setAuth(mockLoginResponse);

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should clear user and token', () => {
      // Set auth first
      useAuthStore.setState({
        user: mockUser,
        token: 'mock-token',
      });

      const { clearAuth } = useAuthStore.getState();
      clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('should mark as not authenticated after clearing', () => {
      useAuthStore.setState({
        user: mockUser,
        token: 'mock-token',
      });

      const { clearAuth } = useAuthStore.getState();
      clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update user', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should allow setting user to null', () => {
      useAuthStore.setState({ user: mockUser });

      const { setUser } = useAuthStore.getState();
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
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
    it('should return true when both user and token exist', () => {
      useAuthStore.setState({
        user: mockUser,
        token: 'mock-token',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(true);
    });

    it('should return false when user is null', () => {
      useAuthStore.setState({
        user: null,
        token: 'mock-token',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });

    it('should return false when token is null', () => {
      useAuthStore.setState({
        user: mockUser,
        token: null,
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });

    it('should return false when both are null', () => {
      useAuthStore.setState({
        user: null,
        token: null,
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });
});
