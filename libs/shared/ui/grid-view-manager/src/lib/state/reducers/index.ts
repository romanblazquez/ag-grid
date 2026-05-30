import {
  Action,
  combineReducers,
  createFeatureSelector,
  createSelector,
  MemoizedSelector,
} from '@ngrx/store';
import * as fromGridView from './grid-view.reducer';
import { GridViewModel } from '../../models/grid-view.model';
import { GRID_VIEW_CONSTRAINTS } from '../../models/grid-view-state.model';

export interface GridViewManagerFeatureState {
  gridViews: fromGridView.GridViewManagerState;
}

export function reducers(
  state: GridViewManagerFeatureState,
  action: Action,
): GridViewManagerFeatureState {
  return combineReducers({
    gridViews: fromGridView.reducer,
  })(state, action);
}

// Feature Selector
export const getGridViewManagerFeatureState =
  createFeatureSelector<GridViewManagerFeatureState>('gridViewManager');

// Top-level selectors
export const getGridViewsState = createSelector(
  getGridViewManagerFeatureState,
  (state) => state.gridViews,
);

// ── Draft selector helpers ─────────────────────────────────────────────────

function createDraftSelectors(
  getViews: MemoizedSelector<object, GridViewModel[]>,
): {
  getDraftView: MemoizedSelector<object, GridViewModel | null>;
  hasDraft: MemoizedSelector<object, boolean>;
  getViewsExcludingDraft: MemoizedSelector<object, GridViewModel[]>;
  getDraftSourceViewId: MemoizedSelector<object, string | undefined>;
} {
  const getDraftView = createSelector(
    getViews,
    (views: GridViewModel[]): GridViewModel | null =>
      views.find((v) => v.isDraft) ?? null,
  );

  const hasDraft = createSelector(getDraftView, (draft) => draft !== null);

  const getViewsExcludingDraft = createSelector(
    getViews,
    (views: GridViewModel[]) => views.filter((v) => !v.isDraft),
  );

  const getDraftSourceViewId = createSelector(
    getDraftView,
    (draft: GridViewModel | null): string | undefined =>
      draft?.draftSourceViewId,
  );

  return {
    getDraftView,
    hasDraft,
    getViewsExcludingDraft,
    getDraftSourceViewId,
  };
}

// Factory function to create selectors for a specific grid
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createGridSelectors = (gridId: string) => {
  const getGridState = createSelector(
    getGridViewsState,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (state) => state[gridId] || fromGridView.initialGridState,
  );

  const getViews = createSelector(getGridState, fromGridView.getViews);

  const getSelectedViewId = createSelector(
    getGridState,
    fromGridView.getSelectedViewId,
  );

  const getDefaultViewId = createSelector(
    getGridState,
    fromGridView.getDefaultViewId,
  );

  const getSelectedView = createSelector(
    getViews,
    getSelectedViewId,
    (views, selectedId): GridViewModel | null =>
      views.find((v) => v.id === selectedId) ?? null,
  );

  const getDefaultView = createSelector(
    getViews,
    getDefaultViewId,
    (views, defaultId): GridViewModel | null =>
      views.find((v) => v.id === defaultId) ?? null,
  );

  const getLoading = createSelector(getGridState, fromGridView.getLoading);

  const getError = createSelector(getGridState, fromGridView.getError);

  const hasViews = createSelector(getViews, (views) => views.length > 0);

  const canAddView = createSelector(
    getViews,
    (views) => views.length < GRID_VIEW_CONSTRAINTS.MAX_VIEWS,
  );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getViewById = (viewId: string) =>
    createSelector(getViews, (views): GridViewModel | undefined =>
      views.find((v) => v.id === viewId),
    );

  const getViewsSortedByName = createSelector(getViews, (views) =>
    [...views].sort((a, b) => a.name.localeCompare(b.name)),
  );

  // ── Draft Selectors ────────────────────────────────────────────────────────
  const draftSelectors = createDraftSelectors(getViews);

  return {
    getGridState,
    getViews,
    getSelectedViewId,
    getDefaultViewId,
    getSelectedView,
    getDefaultView,
    getLoading,
    getError,
    hasViews,
    canAddView,
    getViewById,
    getViewsSortedByName,
    ...draftSelectors,
  };
};
