import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { GridViewModel } from '../models/grid-view.model';
import { GRID_VIEW_CONSTRAINTS } from '../models/grid-view-state.model';

/**
 * Per-grid state shape
 */
export interface GridViewState {
  views: GridViewModel[];
  selectedViewId: string | null;
  defaultViewId: string | null;
  loading: boolean;
  error: string | null;
}

const initialGridState: GridViewState = {
  views: [],
  selectedViewId: null,
  defaultViewId: null,
  loading: false,
  error: null,
};

/**
 * Payload for the "commit draft → save as new view" flow when the source
 * view is a system default (read-only preset).
 */
export interface CommitDraftSaveAsNewPayload {
  gridId: string;
  draftView: GridViewModel;
  sourceView?: GridViewModel;
}

/**
 * Signal-based store replacing the NgRx grid-view-manager state layer.
 *
 * Holds per-gridId state in a single `signal<Record<string, GridViewState>>`.
 * All derived values are `computed()` signals built on top of that root signal.
 *
 * The `commitDraftSaveAsNew$` Subject replaces the NgRx `commitDraftViewSaveAsNew`
 * action so that the facade can react to "save as new" prompts imperatively.
 */
@Injectable({ providedIn: 'root' })
export class GridViewStore {
  // ─── Root state ──────────────────────────────────────────────────────────

  private readonly _state = signal<Record<string, GridViewState>>({});

  /** Emits when a draft commit resolves to "save as new" (source was a system default). */
  public readonly commitDraftSaveAsNew$ =
    new Subject<CommitDraftSaveAsNewPayload>();

  // ─── State access helpers ─────────────────────────────────────────────────

  public getGridState(gridId: string): GridViewState {
    return this._state()[gridId] ?? initialGridState;
  }

  private updateGridState(
    gridId: string,
    updater: (state: GridViewState) => GridViewState,
  ): void {
    const current = this._state();
    const gridState = current[gridId] ?? initialGridState;
    this._state.set({ ...current, [gridId]: updater(gridState) });
  }

  // ─── Computed selector factories ─────────────────────────────────────────

  public getViews(gridId: string) {
    return computed(() => this._state()[gridId]?.views ?? []);
  }

  public getSelectedViewId(gridId: string) {
    return computed(() => this._state()[gridId]?.selectedViewId ?? null);
  }

  public getDefaultViewId(gridId: string) {
    return computed(() => this._state()[gridId]?.defaultViewId ?? null);
  }

  public getSelectedView(gridId: string) {
    return computed(() => {
      const state = this._state()[gridId];
      if (!state) return null;
      return (
        state.views.find((v) => v.id === state.selectedViewId) ?? null
      );
    });
  }

  public getDefaultView(gridId: string) {
    return computed(() => {
      const state = this._state()[gridId];
      if (!state) return null;
      return (
        state.views.find((v) => v.id === state.defaultViewId) ?? null
      );
    });
  }

  public getLoading(gridId: string) {
    return computed(() => this._state()[gridId]?.loading ?? false);
  }

  public getError(gridId: string) {
    return computed(() => this._state()[gridId]?.error ?? null);
  }

  public hasViews(gridId: string) {
    return computed(() => (this._state()[gridId]?.views.length ?? 0) > 0);
  }

  public canAddView(gridId: string) {
    return computed(
      () =>
        (this._state()[gridId]?.views.length ?? 0) <
        GRID_VIEW_CONSTRAINTS.MAX_VIEWS,
    );
  }

  public getDraftView(gridId: string) {
    return computed(() => {
      const views = this._state()[gridId]?.views ?? [];
      return views.find((v) => v.isDraft) ?? null;
    });
  }

  public hasDraft(gridId: string) {
    return computed(() => {
      const views = this._state()[gridId]?.views ?? [];
      return views.some((v) => v.isDraft);
    });
  }

  public getViewsExcludingDraft(gridId: string) {
    return computed(() => {
      const views = this._state()[gridId]?.views ?? [];
      return views.filter((v) => !v.isDraft);
    });
  }

  // ─── Mutators (mirror the NgRx reducer transitions) ───────────────────────

  /** Set loading state for a grid (before async operations). */
  public setLoading(gridId: string, loading: boolean): void {
    this.updateGridState(gridId, (s) => ({ ...s, loading, error: null }));
  }

  /** Called after successfully loading views from storage. */
  public loadViewsSuccess(gridId: string, views: GridViewModel[]): void {
    const defaultView = views.find((v) => v.isDefault);
    const selectedView = views.find((v) => v.isSelected) ?? defaultView;
    this.updateGridState(gridId, (s) => ({
      ...s,
      views,
      defaultViewId: defaultView?.id ?? null,
      selectedViewId: selectedView?.id ?? null,
      loading: false,
      error: null,
    }));
  }

  /** Called when loading views fails. */
  public loadViewsFailure(gridId: string, error: string): void {
    this.updateGridState(gridId, (s) => ({ ...s, loading: false, error }));
  }

  /** Called after successfully creating a view. */
  public createViewSuccess(gridId: string, view: GridViewModel): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views.map((v) => ({
        ...v,
        isSelected: false,
        isDefault: view.isDefault ? false : v.isDefault,
      }));
      views.push(view);
      return {
        ...s,
        views,
        defaultViewId: view.isDefault ? view.id : s.defaultViewId,
        selectedViewId: view.id,
        loading: false,
        error: null,
      };
    });
  }

  /** Called after successfully updating a view. */
  public updateViewSuccess(gridId: string, view: GridViewModel): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views.map((v) => {
        if (v.id === view.id) return view;
        if (view.isDefault && v.isDefault) return { ...v, isDefault: false };
        return v;
      });
      return {
        ...s,
        views,
        defaultViewId: view.isDefault ? view.id : s.defaultViewId,
        loading: false,
        error: null,
      };
    });
  }

  /** Called after successfully deleting a view. */
  public deleteViewSuccess(gridId: string, viewId: string): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views.filter((v) => v.id !== viewId);
      const wasDefault = s.defaultViewId === viewId;
      const wasSelected = s.selectedViewId === viewId;
      const newDefault = wasDefault ? views.find((v) => v.isDefault) : null;
      const defaultViewId = newDefault?.id ?? s.defaultViewId;
      const selectedViewId = wasSelected ? defaultViewId : s.selectedViewId;
      return {
        ...s,
        views,
        defaultViewId,
        selectedViewId,
        loading: false,
        error: null,
      };
    });
  }

  /** Select a view and discard any draft (switching views discards unsaved drafts). */
  public selectView(gridId: string, viewId: string): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views
        .filter((v) => !v.isDraft)
        .map((v) => ({ ...v, isSelected: v.id === viewId }));
      return { ...s, views, selectedViewId: viewId };
    });
  }

  /** Set the default view. */
  public setDefaultViewSuccess(gridId: string, viewId: string): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views.map((v) => ({ ...v, isDefault: v.id === viewId }));
      return { ...s, views, defaultViewId: viewId, loading: false, error: null };
    });
  }

  /** Clear any error for a grid. */
  public clearError(gridId: string): void {
    this.updateGridState(gridId, (s) => ({ ...s, error: null }));
  }

  // ─── Draft mutators ───────────────────────────────────────────────────────

  /** Replace (or add) the draft view and deselect all other views. */
  public saveDraftSuccess(gridId: string, draft: GridViewModel): void {
    this.updateGridState(gridId, (s) => {
      const nonDraftViews = s.views
        .filter((v) => !v.isDraft)
        .map((v) => ({ ...v, isSelected: false }));
      const views = [...nonDraftViews, draft];
      return { ...s, views, selectedViewId: draft.id };
    });
  }

  /**
   * Remove the draft view. If the draft was selected, fall back to the
   * default view (or the first available view).
   */
  public deleteDraftSuccess(gridId: string): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views.filter((v) => !v.isDraft);
      const wasSelected = !views.some((v) => v.isSelected);
      const fallbackId = wasSelected ? s.defaultViewId : s.selectedViewId;
      const resolvedViews = wasSelected
        ? views.map((v) => ({ ...v, isSelected: v.id === fallbackId }))
        : views;
      return { ...s, views: resolvedViews, selectedViewId: fallbackId };
    });
  }

  /**
   * Commit the draft: remove the draft and update the source view.
   * Sets the source view as selected.
   */
  public commitDraftSuccess(gridId: string, sourceView: GridViewModel): void {
    this.updateGridState(gridId, (s) => {
      const views = s.views
        .filter((v) => !v.isDraft)
        .map((v) =>
          v.id === sourceView.id ? sourceView : { ...v, isSelected: false },
        );
      return { ...s, views, selectedViewId: sourceView.id };
    });
  }

  /**
   * Emit the "save as new" signal when committing a draft from a system
   * default. The facade/component subscribes to `commitDraftSaveAsNew$` to
   * open the "Save As New View" dialog.
   */
  public commitDraftSaveAsNew(payload: CommitDraftSaveAsNewPayload): void {
    this.commitDraftSaveAsNew$.next(payload);
  }

  /** Set a generic error for a grid. */
  public setError(gridId: string, error: string): void {
    this.updateGridState(gridId, (s) => ({ ...s, loading: false, error }));
  }
}
