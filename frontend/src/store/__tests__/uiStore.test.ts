/**
 * Tests for uiStore.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      sidebarCollapsed: false,
      globalLoading: false,
      loadingMessage: null,
    });
  });

  describe('initial state', () => {
    it('should have sidebar not collapsed initially', () => {
      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('should have globalLoading false initially', () => {
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
    });

    it('should have no loading message initially', () => {
      const state = useUIStore.getState();
      expect(state.loadingMessage).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from collapsed to expanded', () => {
      useUIStore.setState({ sidebarCollapsed: true });

      const { toggleSidebar } = useUIStore.getState();
      toggleSidebar();

      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar from expanded to collapsed', () => {
      const { toggleSidebar } = useUIStore.getState();
      toggleSidebar();

      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const { toggleSidebar } = useUIStore.getState();

      toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);

      toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);

      toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });
  });

  describe('setSidebarCollapsed', () => {
    it('should set sidebar to collapsed', () => {
      const { setSidebarCollapsed } = useUIStore.getState();
      setSidebarCollapsed(true);

      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('should set sidebar to expanded', () => {
      useUIStore.setState({ sidebarCollapsed: true });

      const { setSidebarCollapsed } = useUIStore.getState();
      setSidebarCollapsed(false);

      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
    });
  });

  describe('setGlobalLoading', () => {
    it('should set loading to true without message', () => {
      const { setGlobalLoading } = useUIStore.getState();
      setGlobalLoading(true);

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBeNull();
    });

    it('should set loading to true with message', () => {
      const { setGlobalLoading } = useUIStore.getState();
      setGlobalLoading(true, 'Loading data...');

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading data...');
    });

    it('should clear message when setting loading to false', () => {
      useUIStore.setState({
        globalLoading: true,
        loadingMessage: 'Loading...',
      });

      const { setGlobalLoading } = useUIStore.getState();
      setGlobalLoading(false);

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });
  });

  describe('showLoading', () => {
    it('should show loading without message', () => {
      const { showLoading } = useUIStore.getState();
      showLoading();

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBeNull();
    });

    it('should show loading with message', () => {
      const { showLoading } = useUIStore.getState();
      showLoading('Processing...');

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe('Processing...');
    });
  });

  describe('hideLoading', () => {
    it('should hide loading and clear message', () => {
      useUIStore.setState({
        globalLoading: true,
        loadingMessage: 'Loading...',
      });

      const { hideLoading } = useUIStore.getState();
      hideLoading();

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });
  });
});
