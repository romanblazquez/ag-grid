import {
  Directive,
  Input,
  OnInit,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { GridViewModel } from '../models/grid-view.model';
import {
  getEmptyGridState,
  applyGridStateHelper,
  areGridStatesEqual,
  CustomGridState,
} from '../data-access/grid-state/grid-state.utils';
import { ColDef, GridApi, GridState, SortState } from 'ag-grid-community';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import {
  filter as rxFilter,
  distinctUntilChanged,
  withLatestFrom,
  map,
} from 'rxjs/operators';
import defaultViewsData from '../data-access/defaults/defaultViews';
import { GridEditSessionService } from '../services/grid-edit-session.service';
import { GridViewStore } from '../state/grid-view.store';
import { GridViewService } from '../data-access/services/grid-view.service';

/**
 * Minimal interface for the AG Grid host that the directive interacts with.
 * Replace `EqtCommonGridComponent` with this interface to decouple from proprietary packages.
 */
export interface AgGridHostInterface {
  gridId: string;
  appName?: string;
  gridApi: GridApi;
  columnDefs: ColDef[];
  stateChanged: Observable<GridState>;
  sortChanged: Observable<SortState>;
  gridReadyEvent: Observable<void>;
  syncExpandCollapseState?: (api: GridApi) => void;
  collapseAll?: () => void;
}

/* eslint-disable @angular-eslint/directive-selector */
@Directive({
  selector: '[gridViewManager]',
  standalone: true,
  exportAs: 'gridViewManager',
  providers: [GridEditSessionService],
})
export class GridViewManagerDirective implements OnInit {
  @Input() public gridId = '';
  @Input() public appName?: string;

  public resolvedId = '';

  public readonly defaultViews: GridViewModel[] = [...defaultViewsData];

  private readonly store = inject(GridViewStore);
  private readonly gridViewService = inject(GridViewService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly editSession = inject(GridEditSessionService);

  // The host grid is injected at the element level — consumers must provide
  // an AgGridHostInterface token or pass the grid reference via input.
  // Keeping as optional to allow standalone usage without the host.
  private grid: AgGridHostInterface | null = null;

  public views = computed(() => this.store.getViews(this.resolvedId)());
  public activeView = computed(
    () => this.store.getSelectedView(this.resolvedId)(),
  );
  public isLoading = computed(() => this.store.getLoading(this.resolvedId)());

  /** Observable adapters for template/pipe usage */
  public views$!: Observable<GridViewModel[]>;
  public activeView$!: Observable<GridViewModel | null>;
  public isLoading$!: Observable<boolean>;

  private currentGridState?: CustomGridState;
  private cachedColumnDefs?: Array<{ colId: string }>;
  private lastColumnDefsRef?: ColDef[];

  private readonly propagate$ = new Subject<void>();

  /**
   * Attach the AG Grid host component/interface so the directive can interact
   * with the live grid. Call this from the host after it is ready.
   */
  public attachGrid(grid: AgGridHostInterface): void {
    this.grid = grid;
  }

  private getColumnDefs(): Array<{ colId: string }> {
    if (!this.grid) return [];

    if (
      this.cachedColumnDefs &&
      this.lastColumnDefsRef === this.grid.columnDefs
    ) {
      return this.cachedColumnDefs;
    }

    this.lastColumnDefsRef = this.grid.columnDefs;
    this.cachedColumnDefs = this.grid.columnDefs
      .filter((col: ColDef) => col.colId)
      .map((col: ColDef) => ({ colId: col.colId as string }));

    return this.cachedColumnDefs;
  }

  public ngOnInit(): void {
    this.resolvedId = this.gridId || (this.grid?.gridId ?? '');

    if (!this.resolvedId.trim()) {
      throw new Error(
        '[GridViewManager] A non-empty gridId is required. Set the directive gridId input or provide a non-empty id on the host grid component before initialization.',
      );
    }

    // Wire up observable adapters from signals
    this.views$ = toObservable(this.store.getViews(this.resolvedId));
    this.activeView$ = toObservable(
      this.store.getSelectedView(this.resolvedId),
    );
    this.isLoading$ = toObservable(this.store.getLoading(this.resolvedId));

    if (!this.appName && this.grid?.appName) {
      this.appName = this.grid.appName;
    }

    if (this.grid) {
      this.grid.gridReadyEvent
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.onGridReady());

      this.subscribeToGridStateChanges();
    }

    // Subscribe to store mutations that should refresh the edit baseline
    this.subscribeToBaselineRefreshSignals();
  }

  private onGridReady(): void {
    this.loadViews();
    this.subscribeToPropagationQueue();
    this.subscribeToActiveViewChanges();
    this.registerFirstRowDataHandler();
  }

  private subscribeToPropagationQueue(): void {
    this.propagate$
      .pipe(
        withLatestFrom(this.activeView$),
        map(([, view]) => view),
        rxFilter((view): view is GridViewModel => view !== null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((view) => this.propagateToGrid(view));
  }

  private subscribeToActiveViewChanges(): void {
    this.activeView$
      .pipe(
        rxFilter((view): view is GridViewModel => view !== null),
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.propagate$.next());
  }

  private registerFirstRowDataHandler(): void {
    if (!this.grid) return;
    const rowDataHandler = (): void => {
      this.grid!.gridApi.removeEventListener('rowDataUpdated', rowDataHandler);
      this.propagate$.next();
    };
    this.grid.gridApi.addEventListener('rowDataUpdated', rowDataHandler);
  }

  private subscribeToGridStateChanges(): void {
    if (!this.grid) return;

    this.grid.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newState: GridState) => {
        this.currentGridState = newState as CustomGridState;
      });

    this.grid.sortChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newSort: SortState) => {
        if (!this.currentGridState) return;
        this.currentGridState = {
          ...this.currentGridState,
          sort: newSort || undefined,
        };
      });
  }

  /**
   * Subscribe to store signals that should trigger an edit session baseline refresh.
   * Replaces the NgRx `ofType(updateGridViewSuccess, createGridViewSuccess, commitDraftViewSuccess)` pipe.
   */
  private subscribeToBaselineRefreshSignals(): void {
    // We refresh the baseline whenever the selected view changes identity
    // (create/update/commit all cause a view identity change in the store).
    this.activeView$
      .pipe(
        rxFilter((v): v is GridViewModel => v !== null && !v.isDraft),
        distinctUntilChanged((a, b) => a.id === b.id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshBaselineFromGrid());
  }

  private refreshBaselineFromGrid(): void {
    if (!this.grid) return;
    const validColIds = new Set<string>(
      this.grid.gridApi.getColumns()?.map((c) => c.getColId()) ?? [],
    );
    const currentState = this.grid.gridApi.getState() as CustomGridState;
    this.editSession.commitBaseline(currentState, validColIds);
  }

  private loadViews(): void {
    if (!this.appName && this.grid?.appName) {
      this.appName = this.grid.appName;
    }

    const columnDefs = this.getColumnDefs();

    this.store.setLoading(this.resolvedId, true);
    this.gridViewService
      .loadViews(this.resolvedId, columnDefs, this.appName)
      .subscribe({
        next: (views) => this.store.loadViewsSuccess(this.resolvedId, views),
        error: (err: Error) =>
          this.store.loadViewsFailure(this.resolvedId, err.message),
      });
  }

  private propagateToGrid(activeView: GridViewModel): void {
    if (!this.grid) return;
    try {
      console.log(
        '[GridViewManager] Propagating active view to grid:',
        activeView.name,
      );
      const gridState = activeView.gridState as CustomGridState;
      const validColIds = new Set<string>(
        this.grid.gridApi.getColumns()?.map((c) => c.getColId()) ?? [],
      );

      const current = this.grid.gridApi.getState() as CustomGridState;
      if (areGridStatesEqual(current, gridState, validColIds)) {
        console.log(
          '[GridViewManager] Grid already shows target state, skipping apply',
        );
        this.editSession.commitBaseline(current, validColIds);
        return;
      }

      this.editSession.suppressChanges(() => {
        applyGridStateHelper(this.grid!.gridApi, getEmptyGridState());

        const stateToApply = structuredClone(
          activeView.gridState,
        ) as CustomGridState;
        const hasExplicitOrder =
          (stateToApply.columnOrder?.orderedColIds?.length ?? 0) > 0;
        if (!hasExplicitOrder) {
          const colDefOrder = this.grid!.columnDefs
            .map((c: ColDef) => c.colId)
            .filter((id): id is string => Boolean(id));
          stateToApply.columnOrder = { orderedColIds: colDefOrder };
        }

        applyGridStateHelper(this.grid!.gridApi, stateToApply);

        if (stateToApply.expandAll) {
          this.grid!.gridApi.expandAll();
        }
        this.grid!.syncExpandCollapseState?.(this.grid!.gridApi);
      });

      const postApplyState = this.grid.gridApi.getState() as CustomGridState;
      this.editSession.commitBaseline(postApplyState, validColIds);

      const rowGroupIds = gridState.rowGroupExpansion?.expandedRowGroupIds;
      if (rowGroupIds?.length) {
        setTimeout(() => {
          this.editSession.suppressChanges(() => {
            this.applyRowGroupExpansion(rowGroupIds);
          });
          this.grid!.syncExpandCollapseState?.(this.grid!.gridApi);
          const postExpandState =
            this.grid!.gridApi.getState() as CustomGridState;
          this.editSession.commitBaseline(postExpandState, validColIds);
        }, 100);
      }

      console.log(
        `[GridViewManager] applyGridStateHelper completed for: ${activeView.id} - ${activeView.name}`,
      );
    } catch (error) {
      console.error('[GridViewManager] Error propagating to grid:', error);
    }
  }

  public resetToActiveView(): void {
    this.propagate$.next();
  }

  private applyRowGroupExpansion(expandedRowGroupIds: string[]): void {
    if (!this.grid?.gridApi) return;

    console.log(
      '[GridViewManager] Applying row group expansion:',
      expandedRowGroupIds,
    );
    this.grid.collapseAll?.();

    this.grid.gridApi.forEachNode((node) => {
      if (node.group && node.id && expandedRowGroupIds.includes(node.id)) {
        node.setExpanded(true);
        console.log('[GridViewManager] Expanded node:', node.id);
      }
    });
  }
}
