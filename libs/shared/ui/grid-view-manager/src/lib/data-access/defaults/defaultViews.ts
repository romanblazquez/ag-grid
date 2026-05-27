/**
 * This file now serves as a re-export module for backward compatibility.
 * The implementation has been split into smaller, focused files:
 * - default-views.types.ts: Type definitions
 * - shared-default-views.config.ts: Shared pivot views configuration
 * - app-default-views.config.ts: App-specific default views configuration
 * - default-views.utils.ts: Utility functions and logic
 */

// Re-export types
export type { AppDefaultView, SharedDefaultView } from './default-views.types';

// Re-export configuration data
export { sharedDefaultViews } from './shared-default-views.config';
export { appDefaultViewsMap } from './app-default-views.config';

// Re-export utility functions and default export
export {
  getDefaultViewForApp,
  getSharedViewsForApp,
  getAllDefaultViewsForApp,
  hasDefaultViewForApp,
  hasAnyDefaultViewsForApp,
  default,
} from './default-views.utils';
