import { GridViewModel } from '../../models/grid-view.model';
import { GRID_VIEW_CONSTRAINTS } from '../../models/grid-view-state.model';
import * as gridViewActions from '../actions/grid-view.actions';
import {
  reducer,
  initialState,
  initialGridState,
  GridViewState,
} from './grid-view.reducer';

const makeView = (overrides: Partial<GridViewModel> = {}): GridViewModel => ({
  id: 'view1',
  name: 'View 1',
  isDefault: false,
  isSelected: false,
  isDraft: false,
  gridState: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const makeDraft = (overrides: Partial<GridViewModel> = {}): GridViewModel =>
  makeView({
    id: 'draft-id',
    name: `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}View 1${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`,
    isDraft: true,
    draftSourceViewId: 'view1',
    isSelected: true,
    ...overrides,
  });

const gridId = 'grid1';

const withGrid = (gridState: Partial<GridViewState>) => ({
  ...initialState,
  [gridId]: { ...initialGridState, ...gridState },
});

describe('grid-view reducer — draft actions', () => {
  describe('saveDraftViewSuccess', () => {
    it('should add the draft to the views array and set it as selected', () => {
      const view = makeView({ isSelected: true });
      const draft = makeDraft();
      const state = withGrid({ views: [view], selectedViewId: view.id });

      const next = reducer(
        state,
        gridViewActions.saveDraftViewSuccess({ gridId, view: draft }),
      );

      expect(next[gridId].views).toContainEqual(draft);
      expect(next[gridId].selectedViewId).toBe(draft.id);
    });

    it('should deselect all non-draft views', () => {
      const view = makeView({ isSelected: true });
      const draft = makeDraft();
      const state = withGrid({ views: [view] });

      const next = reducer(
        state,
        gridViewActions.saveDraftViewSuccess({ gridId, view: draft }),
      );

      const nonDraft = next[gridId].views.filter((v) => !v.isDraft);
      expect(nonDraft.every((v) => !v.isSelected)).toBe(true);
    });

    it('should replace an existing draft instead of duplicating', () => {
      const view = makeView();
      const oldDraft = makeDraft({ id: 'draft-id', name: 'Old draft' });
      const newDraft = makeDraft({ id: 'draft-id', name: 'New draft' });
      const state = withGrid({ views: [view, oldDraft] });

      const next = reducer(
        state,
        gridViewActions.saveDraftViewSuccess({ gridId, view: newDraft }),
      );

      const drafts = next[gridId].views.filter((v) => v.isDraft);
      expect(drafts.length).toBe(1);
      expect(drafts[0].name).toBe('New draft');
    });
  });

  describe('deleteDraftViewSuccess', () => {
    it('should remove the draft from the views array', () => {
      const view = makeView({ isDefault: true, isSelected: false });
      const draft = makeDraft();
      const state = withGrid({
        views: [view, draft],
        selectedViewId: draft.id,
        defaultViewId: view.id,
      });

      const next = reducer(
        state,
        gridViewActions.deleteDraftViewSuccess({ gridId }),
      );

      expect(next[gridId].views.some((v) => v.isDraft)).toBe(false);
    });

    it('should fall back to the default view as selected when draft was selected', () => {
      const defaultView = makeView({
        id: 'def',
        isDefault: true,
        isSelected: false,
      });
      const draft = makeDraft();
      const state = withGrid({
        views: [defaultView, draft],
        selectedViewId: draft.id,
        defaultViewId: defaultView.id,
      });

      const next = reducer(
        state,
        gridViewActions.deleteDraftViewSuccess({ gridId }),
      );

      expect(next[gridId].selectedViewId).toBe(defaultView.id);
      expect(
        next[gridId].views.find((v) => v.id === defaultView.id)?.isSelected,
      ).toBe(true);
    });

    it('should keep the selectedViewId unchanged if the draft was not selected', () => {
      const view = makeView({ id: 'other', isSelected: true });
      const draft = makeDraft({ isSelected: false });
      const state = withGrid({
        views: [view, draft],
        selectedViewId: view.id,
      });

      const next = reducer(
        state,
        gridViewActions.deleteDraftViewSuccess({ gridId }),
      );

      expect(next[gridId].selectedViewId).toBe(view.id);
    });
  });

  describe('commitDraftViewSuccess', () => {
    it('should remove the draft and update the source view', () => {
      const source = makeView({ id: 'source', isSelected: false });
      const draft = makeDraft({ draftSourceViewId: 'source' });
      const updatedSource: GridViewModel = {
        ...source,
        isSelected: true,
        gridState: { columns: {} } as any,
      };
      const state = withGrid({
        views: [source, draft],
        selectedViewId: draft.id,
      });

      const next = reducer(
        state,
        gridViewActions.commitDraftViewSuccess({
          gridId,
          sourceView: updatedSource,
        }),
      );

      expect(next[gridId].views.some((v) => v.isDraft)).toBe(false);
      expect(
        next[gridId].views.find((v) => v.id === 'source')?.isSelected,
      ).toBe(true);
      expect(next[gridId].selectedViewId).toBe('source');
    });

    it('should deselect all other views after commit', () => {
      const source = makeView({ id: 'source' });
      const other = makeView({ id: 'other', isSelected: true });
      const draft = makeDraft({ draftSourceViewId: 'source' });
      const updatedSource: GridViewModel = { ...source, isSelected: true };
      const state = withGrid({ views: [source, other, draft] });

      const next = reducer(
        state,
        gridViewActions.commitDraftViewSuccess({
          gridId,
          sourceView: updatedSource,
        }),
      );

      const selected = next[gridId].views.filter((v) => v.isSelected);
      expect(selected.length).toBe(1);
      expect(selected[0].id).toBe('source');
    });
  });

  describe('selectGridView — draft cleanup', () => {
    it('should remove the draft when the user switches to another view', () => {
      const view = makeView({ id: 'view1' });
      const draft = makeDraft();
      const state = withGrid({
        views: [view, draft],
        selectedViewId: draft.id,
      });

      const next = reducer(
        state,
        gridViewActions.selectGridView({ gridId, viewId: view.id }),
      );

      expect(next[gridId].views.some((v) => v.isDraft)).toBe(false);
      expect(next[gridId].selectedViewId).toBe(view.id);
    });
  });
});
