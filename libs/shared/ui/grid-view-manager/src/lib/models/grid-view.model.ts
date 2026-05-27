import { CustomGridState } from '../data-access/grid-state/gridState';

/**
 * Represents a saved grid view with its configuration
 */
export interface GridViewModel {
  /** Unique identifier for the view */
  id: string;

  /** Display name of the view */
  name: string;

  /** Optional description of the view */
  description?: string;

  /** Whether this view is set as the default */
  isDefault: boolean;

  /** Selected view */
  isSelected: boolean;

  /** Whether this is a system-provided default view (read-only, can only be copied) */
  isSystemDefault?: boolean;

  /** Whether this view is an unsaved draft (auto-created on state change) */
  isDraft?: boolean;

  /** The id of the source view this draft was created from */
  draftSourceViewId?: string;

  /** Captured AG-Grid state */
  gridState: GridViewState;

  /** When the view was created */
  createdAt: Date;

  /** When the view was last modified */
  updatedAt: Date;

  /** User who created the view */
  createdBy?: string;
}

/**
 * Complete AG-Grid state that can be saved and restored
 */
export type GridViewState = CustomGridState;

/**
 * Column state within a grid view
 */
export interface ColumnState {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: string | null;
  sort?: string | null;
  sortIndex?: number | null;
  aggFunc?: string | null;
  rowGroup?: boolean;
  rowGroupIndex?: number | null;
  pivot?: boolean;
  pivotIndex?: number | null;
  flex?: number | null;
}
