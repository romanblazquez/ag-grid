import { createReducer, on } from '@ngrx/store';
import { GridViewModel } from '../../models/grid-view.model';
import * as gridViewActions from '../actions/grid-view.actions';

/**
 * State for a single grid's views
 */
export interface GridViewState {
  views: GridViewModel[];
  selectedViewId: string | null;
  defaultViewId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Root state containing all grids' view states
 */
export interface GridViewManagerState {
  [gridId: string]: GridViewState;
}

export const initialGridState: GridViewState = {
  views: [],
  selectedViewId: null,
  defaultViewId: null,
  loading: false,
  error: null,
};

export const initialState: GridViewManagerState = {};

export const reducer = createReducer(
  initialState,

  // Load Views
  on(gridViewActions.loadGridViews, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: true,
      error: null,
    },
  })),

  on(gridViewActions.loadGridViewsSuccess, (state, { gridId, views }) => {
    const defaultView = views.find((v) => v.isDefault);
    // Restore the previously selected view if saved in iPref, otherwise use default
    const selectedView = views.find((v) => v.isSelected) ?? defaultView;

    return {
      ...state,
      [gridId]: {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        ...(state[gridId] || initialGridState),
        views,
        defaultViewId: defaultView?.id ?? null,
        selectedViewId: selectedView?.id ?? null,
        loading: false,
        error: null,
      },
    };
  }),

  on(gridViewActions.loadGridViewsFailure, (state, { gridId, error }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: false,
      error,
    },
  })),

  // Create View
  on(gridViewActions.createGridView, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: true,
      error: null,
    },
  })),

  on(gridViewActions.createGridViewSuccess, (state, { gridId, view }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;

    // Create immutable copy with updated isSelected flags
    const views = gridState.views.map((v) => ({
      ...v,
      isSelected: false,
      isDefault: view.isDefault ? false : v.isDefault,
    }));

    views.push(view);

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        defaultViewId: view.isDefault ? view.id : gridState.defaultViewId,
        selectedViewId: view.id,
        loading: false,
        error: null,
      },
    };
  }),

  on(gridViewActions.createGridViewFailure, (state, { gridId, error }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: false,
      error,
    },
  })),

  // Update View
  on(gridViewActions.updateGridView, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: true,
      error: null,
    },
  })),

  on(gridViewActions.updateGridViewSuccess, (state, { gridId, view }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;
    const views = gridState.views.map((v) => {
      if (v.id === view.id) {
        return view;
      }
      // If new view is default, unset others
      if (view.isDefault && v.isDefault) {
        return { ...v, isDefault: false };
      }
      return v;
    });

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        defaultViewId: view.isDefault ? view.id : gridState.defaultViewId,
        loading: false,
        error: null,
      },
    };
  }),

  on(gridViewActions.updateGridViewFailure, (state, { gridId, error }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: false,
      error,
    },
  })),

  // Delete View
  on(gridViewActions.deleteGridView, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: true,
      error: null,
    },
  })),

  on(gridViewActions.deleteGridViewSuccess, (state, { gridId, viewId }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;
    const views = gridState.views.filter((v) => v.id !== viewId);
    const wasDefault = gridState.defaultViewId === viewId;
    const wasSelected = gridState.selectedViewId === viewId;

    // Find new default if needed
    const newDefault = wasDefault ? views.find((v) => v.isDefault) : null;
    const defaultViewId = newDefault?.id ?? gridState.defaultViewId;
    const selectedViewId = wasSelected
      ? defaultViewId
      : gridState.selectedViewId;

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        defaultViewId,
        selectedViewId,
        loading: false,
        error: null,
      },
    };
  }),

  on(gridViewActions.deleteGridViewFailure, (state, { gridId, error }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: false,
      error,
    },
  })),

  // Select View
  on(gridViewActions.selectGridView, (state, { gridId, viewId }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;

    // Remove any draft and update isSelected — switching views discards unsaved drafts.
    // The persistSelectedView$ effect simultaneously removes the draft from iPref.
    const views = gridState.views
      .filter((v) => !v.isDraft)
      .map((v) => ({
        ...v,
        isSelected: v.id === viewId,
      }));

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        selectedViewId: viewId,
      },
    };
  }),

  // Set Default View
  on(gridViewActions.setDefaultView, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: true,
      error: null,
    },
  })),

  on(gridViewActions.setDefaultViewSuccess, (state, { gridId, viewId }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;
    const views = gridState.views.map((v) => ({
      ...v,
      isDefault: v.id === viewId,
    }));

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        defaultViewId: viewId,
        loading: false,
        error: null,
      },
    };
  }),

  on(gridViewActions.setDefaultViewFailure, (state, { gridId, error }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      loading: false,
      error,
    },
  })),

  // Clear Error
  on(gridViewActions.clearError, (state, { gridId }) => ({
    ...state,
    [gridId]: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ...(state[gridId] || initialGridState),
      error: null,
    },
  })),

  // ── Draft View Reducers ──────────────────────────────────────────────────

  on(gridViewActions.saveDraftViewSuccess, (state, { gridId, view }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;
    // Replace any existing draft and deselect all other views
    const nonDraftViews = gridState.views
      .filter((v) => !v.isDraft)
      .map((v) => ({ ...v, isSelected: false }));
    const views = [...nonDraftViews, view];

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views,
        selectedViewId: view.id,
      },
    };
  }),

  on(gridViewActions.deleteDraftViewSuccess, (state, { gridId }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const gridState = state[gridId] || initialGridState;
    const views = gridState.views.filter((v) => !v.isDraft);
    // If the draft was selected, fall back to the default view
    const wasSelected = !views.some((v) => v.isSelected);
    const fallbackId = wasSelected
      ? gridState.defaultViewId
      : gridState.selectedViewId;
    const resolvedViews = wasSelected
      ? views.map((v) => ({ ...v, isSelected: v.id === fallbackId }))
      : views;

    return {
      ...state,
      [gridId]: {
        ...gridState,
        views: resolvedViews,
        selectedViewId: fallbackId,
      },
    };
  }),

  on(
    gridViewActions.commitDraftViewSuccess,
    (state, { gridId, sourceView }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const gridState = state[gridId] || initialGridState;
      // Remove draft and update source view, set source as selected
      const views = gridState.views
        .filter((v) => !v.isDraft)
        .map((v) =>
          v.id === sourceView.id ? sourceView : { ...v, isSelected: false },
        );

      return {
        ...state,
        [gridId]: {
          ...gridState,
          views,
          selectedViewId: sourceView.id,
        },
      };
    },
  ),
);

// Selector functions
export const getViews = (state: GridViewState): GridViewModel[] => state.views;
export const getSelectedViewId = (state: GridViewState): string | null =>
  state.selectedViewId;
export const getDefaultViewId = (state: GridViewState): string | null =>
  state.defaultViewId;
export const getLoading = (state: GridViewState): boolean => state.loading;
export const getError = (state: GridViewState): string | null => state.error;
