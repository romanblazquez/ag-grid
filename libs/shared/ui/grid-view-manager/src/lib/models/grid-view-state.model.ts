/**
 * Import from grid-view.model.ts to avoid circular dependency
 * Re-exported here for convenience
 */
import type { GridViewModel } from './grid-view.model';
export type { GridViewModel };

/**
 * Dialog form data for creating/editing views
 */
export interface ViewDialogData {
  /** View name (required) */
  name: string;

  /** View description (optional) */
  description?: string;

  /** Whether to set this view as default */
  setAsDefault: boolean;

  /** Whether to capture current grid state */
  applyCurrentState: boolean;

  /** Existing view data when editing */
  existingView?: GridViewModel;
}

/**
 * Validation constraints
 */
export const GRID_VIEW_CONSTRAINTS = {
  /** Maximum number of views per grid */
  MAX_VIEWS: 30,

  /** Maximum length for view name */
  MAX_NAME_LENGTH: 50,

  /** Maximum length for description */
  MAX_DESCRIPTION_LENGTH: 200,

  /** Reserved view names that cannot be used */
  RESERVED_NAMES: ['Default', 'System Default'] as const,

  /** Suffix appended to draft view names: "{source name} - Draft" */
  DRAFT_SUFFIX: ' - Draft',
  DRAFT_PREFIX: '[Draft]: ',
} as const;

/**
 * Configuration for iPref storage
 */
export interface GridViewPreferenceConfig {
  /** Application identifier */
  appName: string;

  /** Node in the preference tree */
  node: string;

  /** Unique key for this grid's views */
  gridId: string;
}

/**
 * Storage format for grid views in iPref
 */
export interface GridViewPreferenceData {
  /** Collection of saved views */
  views: Array<GridViewModel>;

  /** Version for future migration support */
  version: number;

  /**
   * Persisted id of the currently selected view. This is used to restore the selected view on load.
   */
  selectedViewId?: string | null;
}
