import { Injectable, inject, DestroyRef, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { GridViewModel } from '../models/grid-view.model';
import {
  getEmptyGridState,
  CustomGridState,
} from '../data-access/grid-state/grid-state.utils';
import { GridState } from 'ag-grid-community';
import { GRID_VIEW_CONSTRAINTS } from '../models/grid-view-state.model';
import {
  Subject,
  BehaviorSubject,
  Observable,
  combineLatest,
  NEVER,
  of,
} from 'rxjs';
import { debounceTime, filter, map, switchMap, catchError, withLatestFrom } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GridEditSessionService } from '../services/grid-edit-session.service';
import { GridViewStore } from '../state/grid-view.store';
import { GridViewService } from '../data-access/services/grid-view.service';

interface GridStateChangePayload {
  gridId: string;
  gridState: GridState;
  columnDefs: Array<{ colId: string }>;
  /** Valid column IDs captured at emission time for baseline comparison. */
  validColIds: Set<string>;
  appName?: string;
}

/** Duration (ms) after which grid changes are considered settled for auto-save. */
const DEBOUNCE_DELAY_MS = 2000;

/**
 * Stateful facade for the grid-view-header component.
 *
 * Owns debounce timing, auto-save decisions, and the reactive state
 * observables consumed by the header. Provided at the component level
 * so each header instance has its own isolated state scope.
 *
 * Replaces the original NgRx Store + Actions + Effects integration with
 * direct calls to GridViewStore (signals) and GridViewService (storage).
 */
@Injectable()
export class GridViewHeaderFacadeService {
  /** Duration after which grid changes are considered settled for auto-save. */
  public static readonly DEBOUNCE_DELAY_MS = DEBOUNCE_DELAY_MS;

  private readonly store = inject(GridViewStore);
  private readonly gridViewService = inject(GridViewService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editSession = inject(GridEditSessionService, {
    optional: true,
  });

  private readonly gridStateSubject = new Subject<GridStateChangePayload>();
  private readonly _isSaving$ = new BehaviorSubject<boolean>(false);
  private readonly _hasStateChanged$ = new BehaviorSubject<boolean>(false);

  /**
   * True from the moment a grid state change arrives until the debounce settles.
   * Drives the progress spinner in the header.
   */
  public readonly isSaving$: Observable<boolean> =
    this._isSaving$.asObservable();

  /**
   * True once the debounce has settled after a user-driven grid change.
   * Resets to false whenever the active view changes.
   */
  public readonly hasStateChanged$: Observable<boolean> =
    this._hasStateChanged$.asObservable();

  /** Store-backed views list for the current grid. Populated by {@link init}. */
  public views$: Observable<GridViewModel[]> = NEVER;

  /** Store-backed active view for the current grid. Populated by {@link init}. */
  public activeView$: Observable<GridViewModel | null> = NEVER;

  /**
   * True when there are live (debounced) grid changes OR the active view is itself
   * a draft from a previous session. Populated by {@link init}.
   */
  public hasUnsavedChanges$: Observable<boolean> = NEVER;

  /**
   * True when the Save button should be enabled: unsaved changes exist, and the
   * active view is not a system preset/default view. Populated by {@link init}.
   */
  public canSave$: Observable<boolean> = NEVER;

  /**
   * Emits when a draft commit resolves to "save as new" (source is a system
   * default/preset). The component opens a "Save As New View" dialog on emission.
   * Populated by {@link init}.
   */
  public saveAsNewRequired$: Observable<{
    draftView: GridViewModel;
    sourceView: GridViewModel | undefined;
    suggestedName: string;
  }> = NEVER;

  /**
   * Initialises all reactive pipelines for the given grid. Must be called once
   * in `ngOnInit` after `gridId` is resolved, before any observable bindings.
   */
  public init(gridId: string): void {
    const views$ = toObservable(this.store.getViews(gridId));
    const activeView$ = toObservable(this.store.getSelectedView(gridId));

    this.views$ = views$;
    this.activeView$ = activeView$;

    this.setupGridStateSubscriptions(activeView$);

    // hasUnsavedChanges$: live settled changes OR the active view is a draft.
    this.hasUnsavedChanges$ = combineLatest([
      this._hasStateChanged$,
      activeView$,
    ]).pipe(
      map(
        ([hasStateChanged, activeView]) =>
          hasStateChanged || activeView?.isDraft === true,
      ),
    );

    this.canSave$ = this.buildCanSave$(activeView$, views$);
    this.saveAsNewRequired$ = this.buildSaveAsNewRequired$(gridId, views$);
  }

  /**
   * Subscribes to grid-state changes and active-view resets.
   * Drives the spinner and debounced auto-save pipeline.
   */
  private setupGridStateSubscriptions(
    activeView$: Observable<GridViewModel | null>,
  ): void {
    this.gridStateSubject
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._isSaving$.next(true);
        this._hasStateChanged$.next(false);
      });

    this.gridStateSubject
      .pipe(
        debounceTime(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS),
        withLatestFrom(activeView$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([payload, activeView]) => {
        this._isSaving$.next(false);

        if (
          this.editSession &&
          !this.editSession.hasChangedFromBaseline(
            payload.gridState as CustomGridState,
            payload.validColIds,
          )
        ) {
          return;
        }

        this._hasStateChanged$.next(true);
        if (activeView) {
          this.autoSaveDraft(
            payload.gridId,
            activeView,
            payload.gridState,
            payload.columnDefs,
            payload.appName,
          );
        }
      });

    // Reset state when the active view changes (selected, saved, or discarded).
    activeView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this._hasStateChanged$.next(false);
      this._isSaving$.next(false);
    });
  }

  /**
   * Builds the `canSave$` observable:
   * true when unsaved changes exist and the active view is not a read-only preset/default.
   */
  private buildCanSave$(
    activeView$: Observable<GridViewModel | null>,
    views$: Observable<GridViewModel[]>,
  ): Observable<boolean> {
    return combineLatest([this._hasStateChanged$, activeView$, views$]).pipe(
      map(([hasStateChanged, activeView, views]) => {
        if (!activeView) return false;
        const hasDraftChanges = activeView.isDraft === true;
        const hasUnsaved = hasStateChanged || hasDraftChanges;
        if (!hasUnsaved) return false;
        if (
          activeView.isDefault === true ||
          activeView.isSystemDefault === true
        )
          return false;
        if (activeView.isDraft === true) {
          const sourceId = activeView.draftSourceViewId;
          const isFromPreset = views.some(
            (v) =>
              v.id === sourceId &&
              (v.isSystemDefault === true || v.isDefault === true),
          );
          if (isFromPreset) return false;
        }
        return true;
      }),
    );
  }

  /**
   * Builds the `saveAsNewRequired$` observable:
   * emits when the store signals that a draft commit requires a "Save As New View" dialog.
   */
  private buildSaveAsNewRequired$(
    gridId: string,
    views$: Observable<GridViewModel[]>,
  ): Observable<{
    draftView: GridViewModel;
    sourceView: GridViewModel | undefined;
    suggestedName: string;
  }> {
    return this.store.commitDraftSaveAsNew$.pipe(
      filter((payload) => payload.gridId === gridId),
      withLatestFrom(views$),
      map(([{ draftView, sourceView }, views]) => {
        const baseName =
          sourceView?.name ??
          draftView.name
            .replace(GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX, '')
            .replace(GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX, '');
        const suggestedName = this.generateUniqueName(views, baseName);
        return { draftView, sourceView, suggestedName };
      }),
    );
  }

  /**
   * Called by the component whenever the grid emits a state change event
   * and the origin gate confirms it is a genuine user interaction.
   * Pushes to the internal Subject which drives the debounce pipeline.
   */
  public notifyGridStateChanged(
    gridId: string,
    gridState: GridState,
    columnDefs: Array<{ colId: string }>,
    validColIds: Set<string>,
    appName?: string,
  ): void {
    this.gridStateSubject.next({
      gridId,
      gridState,
      columnDefs,
      validColIds,
      appName,
    });
  }

  public selectView(
    gridId: string,
    views: GridViewModel[],
    viewName: string,
    appName?: string,
  ): void {
    const selected = views.find((v: GridViewModel) => v.name === viewName);
    if (selected) {
      // Persist selection then update store
      this.gridViewService
        .saveAllViews(
          gridId,
          views
            .filter((v) => !v.isDraft)
            .map((v) => ({ ...v, isSelected: v.id === selected.id })),
          appName,
        )
        .pipe(catchError(() => of(undefined)))
        .subscribe();
      this.store.selectView(gridId, selected.id);
    }
  }

  public editView(
    gridId: string,
    views: GridViewModel[],
    data: { oldName: string; newName: string },
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    const view = views.find((v: GridViewModel) => v.name === data.oldName);
    if (view && !view.isDefault) {
      const updatedView = { ...view, name: data.newName };
      this.store.setLoading(gridId, true);
      this.gridViewService
        .updateView(gridId, updatedView, columnDefs, appName)
        .pipe(catchError((err: Error) => {
          this.store.setError(gridId, err.message);
          return of(null);
        }))
        .subscribe((result) => {
          if (result) this.store.updateViewSuccess(gridId, result);
        });
    }
  }

  public deleteView(
    gridId: string,
    viewId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    this.store.setLoading(gridId, true);
    this.gridViewService
      .deleteView(gridId, viewId, columnDefs, appName)
      .pipe(catchError((err: Error) => {
        this.store.setError(gridId, err.message);
        return of(undefined);
      }))
      .subscribe(() => {
        this.store.deleteViewSuccess(gridId, viewId);
      });
  }

  public createView(
    gridId: string,
    view: GridViewModel,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    const newView: Omit<GridViewModel, 'id' | 'createdAt' | 'updatedAt'> = {
      name: view.name,
      description: `Custom view: ${view.name}`,
      isDefault: false,
      isSelected: true,
      gridState: view.gridState,
      createdBy: 'user',
    };
    this.store.setLoading(gridId, true);
    this.gridViewService
      .createView(gridId, newView, columnDefs, appName)
      .pipe(catchError((err: Error) => {
        this.store.setError(gridId, err.message);
        return of(null);
      }))
      .subscribe((created) => {
        if (created) this.store.createViewSuccess(gridId, created);
      });
  }

  public createViewFromDialog(
    gridId: string,
    result: { mode: 'create' | 'edit'; name: string },
    gridState: CustomGridState | null,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    if (result.mode === 'create' && result.name) {
      const newView: Omit<GridViewModel, 'id' | 'createdAt' | 'updatedAt'> = {
        name: result.name,
        description: `Custom view: ${result.name}`,
        isDefault: false,
        isSelected: true,
        gridState: gridState ?? getEmptyGridState(),
        createdBy: 'user',
      };
      this.store.setLoading(gridId, true);
      this.gridViewService
        .createView(gridId, newView, columnDefs, appName)
        .pipe(catchError((err: Error) => {
          this.store.setError(gridId, err.message);
          return of(null);
        }))
        .subscribe((created) => {
          if (created) this.store.createViewSuccess(gridId, created);
        });
    }
  }

  public generateUniqueName(views: GridViewModel[], baseName: string): string {
    const existingNames = views.map((v) => v.name);
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    let counter = 2;
    let newName = `${baseName} (${counter})`;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }
    return newName;
  }

  public saveView(
    gridId: string,
    activeView: GridViewModel,
    currentGridState: GridState,
    expandAll: boolean,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    if (activeView.isDraft) {
      this.gridViewService
        .commitDraft(gridId, columnDefs, appName)
        .pipe(
          catchError((err: Error) => {
            this.store.setError(gridId, err.message);
            return of(null);
          }),
        )
        .subscribe((result) => {
          if (!result) return;
          if (result.committed && result.sourceView) {
            this.store.commitDraftSuccess(gridId, result.sourceView);
          } else if (result.draftView) {
            this.store.commitDraftSaveAsNew({
              gridId,
              draftView: result.draftView,
              sourceView: result.sourceView,
            });
          }
        });
      return;
    }

    const updatedView = {
      ...activeView,
      gridState: { ...currentGridState, expandAll },
    };
    this.store.setLoading(gridId, true);
    this.gridViewService
      .updateView(gridId, updatedView, columnDefs, appName)
      .pipe(catchError((err: Error) => {
        this.store.setError(gridId, err.message);
        return of(null);
      }))
      .subscribe((result) => {
        if (result) this.store.updateViewSuccess(gridId, result);
      });
  }

  public discardDraft(
    gridId: string,
    fallbackViewId: string | undefined,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    this.gridViewService
      .deleteDraft(gridId, columnDefs, appName, fallbackViewId)
      .pipe(catchError(() => of(undefined)))
      .subscribe(() => {
        this.store.deleteDraftSuccess(gridId);
        if (fallbackViewId) {
          this.store.selectView(gridId, fallbackViewId);
        }
      });
  }

  public autoSaveDraft(
    gridId: string,
    activeView: GridViewModel,
    currentGridState: GridState,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): void {
    const isDraft = activeView.isDraft;
    const sourceId = isDraft
      ? (activeView.draftSourceViewId ?? activeView.id)
      : activeView.id;
    const sourceViewName = isDraft
      ? activeView.name
          .replace(GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX, '')
          .replace(GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX, '')
      : activeView.name;

    this.gridViewService
      .saveDraft(
        gridId,
        sourceId,
        sourceViewName,
        currentGridState,
        columnDefs,
        appName,
      )
      .pipe(catchError((err: Error) => {
        this.store.setError(gridId, err.message);
        return of(null);
      }))
      .subscribe((draft) => {
        if (draft) this.store.saveDraftSuccess(gridId, draft);
      });
  }
}
