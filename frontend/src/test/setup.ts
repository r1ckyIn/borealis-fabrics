import '@testing-library/jest-dom';

// Mock window.matchMedia for Ant Design responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Extend globalThis type for jsdom environment (missing ResizeObserver)
declare global {
  // eslint-disable-next-line no-var
  var ResizeObserver: {
    new (callback: ResizeObserverCallback): ResizeObserver;
  };
}

// Mock ResizeObserver for Ant Design components
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
