import { createAction, props } from '@ngrx/store';
import { GridViewModel } from '../../models/grid-view.model';
import { GridState } from '@ag-grid-community/core';

const gridView = '[Grid View Manager]';

// Load Actions
export const loadGridViews = createAction(
  `${gridView} Load Grid Views`,
  props<{
    gridId: string;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const loadGridViewsSuccess = createAction(
  `${gridView} Load Grid Views Success`,
  props<{ gridId: string; views: GridViewModel[] }>(),
);

export const loadGridViewsFailure = createAction(
  `${gridView} Load Grid Views Failure`,
  props<{ gridId: string; error: string }>(),
);

// Create View
export const createGridView = createAction(
  `${gridView} Create Grid View`,
  props<{
    gridId: string;
    view: Omit<GridViewModel, 'id' | 'createdAt' | 'updatedAt'>;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const createGridViewSuccess = createAction(
  `${gridView} Create Grid View Success`,
  props<{ gridId: string; view: GridViewModel }>(),
);

export const createGridViewFailure = createAction(
  `${gridView} Create Grid View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Update View
export const updateGridView = createAction(
  `${gridView} Update Grid View`,
  props<{
    gridId: string;
    view: GridViewModel;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const updateGridViewSuccess = createAction(
  `${gridView} Update Grid View Success`,
  props<{ gridId: string; view: GridViewModel }>(),
);

export const updateGridViewFailure = createAction(
  `${gridView} Update Grid View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Delete View
export const deleteGridView = createAction(
  `${gridView} Delete Grid View`,
  props<{
    gridId: string;
    viewId: string;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const deleteGridViewSuccess = createAction(
  `${gridView} Delete Grid View Success`,
  props<{ gridId: string; viewId: string }>(),
);

export const deleteGridViewFailure = createAction(
  `${gridView} Delete Grid View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Select View
export const selectGridView = createAction(
  `${gridView} Select Grid View`,
  props<{ gridId: string; viewId: string; appName?: string }>(),
);

// Set Default View
export const setDefaultView = createAction(
  `${gridView} Set Default View`,
  props<{ gridId: string; viewId: string }>(),
);

export const setDefaultViewSuccess = createAction(
  `${gridView} Set Default View Success`,
  props<{ gridId: string; viewId: string }>(),
);

export const setDefaultViewFailure = createAction(
  `${gridView} Set Default View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Apply View to Grid
export const applyGridView = createAction(
  `${gridView} Apply Grid View`,
  props<{ gridId: string; view: GridViewModel }>(),
);

// Clear Error
export const clearError = createAction(
  `${gridView} Clear Error`,
  props<{ gridId: string }>(),
);

// ── Draft View Actions ─────────────────────────────────────────────────────

// Save (create or update) a draft for the currently selected view
export const saveDraftView = createAction(
  `${gridView} Save Draft View`,
  props<{
    gridId: string;
    sourceViewId: string;
    /** The display name of the source view — passed explicitly so naming never relies on an ID lookup */
    sourceViewName: string;
    draftGridState: GridState;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const saveDraftViewSuccess = createAction(
  `${gridView} Save Draft View Success`,
  props<{ gridId: string; view: GridViewModel }>(),
);

export const saveDraftViewFailure = createAction(
  `${gridView} Save Draft View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Delete the current draft (e.g. when switching views without saving)
export const deleteDraftView = createAction(
  `${gridView} Delete Draft View`,
  props<{
    gridId: string;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
    /** The view to restore as selected after the draft is discarded */
    fallbackViewId?: string;
  }>(),
);

export const deleteDraftViewSuccess = createAction(
  `${gridView} Delete Draft View Success`,
  props<{ gridId: string }>(),
);

export const deleteDraftViewFailure = createAction(
  `${gridView} Delete Draft View Failure`,
  props<{ gridId: string; error: string }>(),
);

// Commit the draft to the source view (or signal "save as new" for presets)
export const commitDraftView = createAction(
  `${gridView} Commit Draft View`,
  props<{
    gridId: string;
    columnDefs: Array<{ colId: string }>;
    appName?: string;
  }>(),
);

export const commitDraftViewSuccess = createAction(
  `${gridView} Commit Draft View Success`,
  props<{ gridId: string; sourceView: GridViewModel }>(),
);

/** Emitted when the source is a preset/system default — UI should prompt "Save As New View" */
export const commitDraftViewSaveAsNew = createAction(
  `${gridView} Commit Draft View Save As New`,
  props<{
    gridId: string;
    draftView: GridViewModel;
    sourceView?: GridViewModel;
  }>(),
);

export const commitDraftViewFailure = createAction(
  `${gridView} Commit Draft View Failure`,
  props<{ gridId: string; error: string }>(),
);
