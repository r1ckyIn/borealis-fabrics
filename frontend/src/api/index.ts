/**
 * API module exports for Borealis Fabrics.
 */

// Default API client
export { default as apiClient } from './client';

// Helper methods
export { get, post, put, patch, del } from './client';

// Auth API
export * from './auth.api';
export { authApi } from './auth.api';

// System API
export * from './system.api';
export { systemApi } from './system.api';
