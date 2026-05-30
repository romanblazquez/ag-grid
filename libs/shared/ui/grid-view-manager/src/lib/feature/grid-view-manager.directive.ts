import { Directive, Input, OnInit, DestroyRef, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { GridViewModel } from '../models/grid-view.model';
import { EqtCommonGridComponent } from '@fmr-pr000539/eqt-common-grid';
import {
  getEmptyGridState,
  applyGridStateHelper,
  areGridStatesEqual,
  CustomGridState,
} from '../data-access/grid-state/grid-state.utils';
import { ColDef, GridState, SortState } from '@ag-grid-community/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import {
  filter as rxFilter,
  distinctUntilChanged,
  withLatestFrom,
  map,
} from 'rxjs/operators';
import defaultViewsData from '../data-access/defaults/defaultViews';
import * as gridViewActions from '../state/actions/grid-view.actions';
import { createGridSelectors } from '../state/reducers';
import { safeDeepClone } from '@fmr-pr000539/shared/util/common';
import { GridEditSessionService } from '../services/grid-edit-session.service';

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

  private readonly grid = inject(EqtCommonGridComponent);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  public readonly editSession = inject(GridEditSessionService);

  private gridSelectors = createGridSelectors('');

  public views$!: Observable<GridViewModel[]>;
  public activeView$!: Observable<GridViewModel | null>;
  public isLoading$!: Observable<boolean>;

  private currentGridState?: CustomGridState;
  private cachedColumnDefs?: Array<{ colId: string }>;
  private lastColumnDefsRef?: ColDef[];

  private readonly propagate$ = new Subject<void>();

  private getColumnDefs(): Array<{ colId: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
    this.resolvedId = this.gridId || this.grid.gridId;

    if (!this.resolvedId.trim()) {
      throw new Error(
        '[GridViewManager] A non-empty gridId is required. Set the directive gridId input or provide a non-empty id on the host EqtCommonGridComponent before initialization.',
      );
    }

    this.gridSelectors = createGridSelectors(this.resolvedId);
    this.views$ = this.store.select(this.gridSelectors.getViews);
    this.activeView$ = this.store.select(this.gridSelectors.getSelectedView);
    this.isLoading$ = this.store.select(this.gridSelectors.getLoading);

    if (!this.appName && this.grid.appName) {
      this.appName = this.grid.appName;
    }

    this.grid.gridReadyEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onGridReady());

    this.subscribeToGridStateChanges();
    this.subscribeToBaselineRefreshActions();
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
    const rowDataHandler = (): void => {
      this.grid.gridApi.removeEventListener('rowDataUpdated', rowDataHandler);
      this.propagate$.next();
    };
    this.grid.gridApi.addEventListener('rowDataUpdated', rowDataHandler);
  }

  private subscribeToGridStateChanges(): void {
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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          sort: newSort || undefined,
        };
      });
  }

  private subscribeToBaselineRefreshActions(): void {
    this.actions$
      .pipe(
        ofType(
          gridViewActions.updateGridViewSuccess,
          gridViewActions.createGridViewSuccess,
          gridViewActions.commitDraftViewSuccess,
        ),
        rxFilter(({ gridId }) => gridId === this.resolvedId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshBaselineFromGrid());
  }

  private refreshBaselineFromGrid(): void {
    const validColIds = new Set<string>(
      this.grid.gridApi.getColumns()?.map((c) => c.getColId()) ?? [],
    );
    const currentState = this.grid.gridApi.getState() as CustomGridState;
    this.editSession.commitBaseline(currentState, validColIds);
  }

  private loadViews(): void {
    if (!this.appName && this.grid.appName) {
      this.appName = this.grid.appName;
    }

    const columnDefs = this.getColumnDefs();

    this.store.dispatch(
      gridViewActions.loadGridViews({
        gridId: this.resolvedId,
        columnDefs,
        appName: this.appName,
      }),
    );
  }

  private propagateToGrid(activeView: GridViewModel): void {
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
        applyGridStateHelper(this.grid.gridApi, getEmptyGridState());

        const stateToApply = safeDeepClone(
          activeView.gridState,
        ) as CustomGridState;
        const hasExplicitOrder =
          (stateToApply.columnOrder?.orderedColIds?.length ?? 0) > 0;
        if (!hasExplicitOrder) {
          const colDefOrder = this.grid.columnDefs
            .map((c: ColDef) => c.colId)
            .filter((id): id is string => Boolean(id));
          stateToApply.columnOrder = { orderedColIds: colDefOrder };
        }

        applyGridStateHelper(this.grid.gridApi, stateToApply);

        if (stateToApply.expandAll) {
          this.grid.gridApi.expandAll();
        }
        this.grid.syncExpandCollapseState(this.grid.gridApi);
      });

      const postApplyState = this.grid.gridApi.getState() as CustomGridState;
      this.editSession.commitBaseline(postApplyState, validColIds);

      const rowGroupIds = gridState.rowGroupExpansion?.expandedRowGroupIds;
      if (rowGroupIds?.length) {
        setTimeout(() => {
          this.editSession.suppressChanges(() => {
            this.applyRowGroupExpansion(rowGroupIds);
          });
          this.grid.syncExpandCollapseState(this.grid.gridApi);
          const postExpandState =
            this.grid.gridApi.getState() as CustomGridState;
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.grid.gridApi) return;

    console.log(
      '[GridViewManager] Applying row group expansion:',
      expandedRowGroupIds,
    );
    this.grid.collapseAll();

    this.grid.gridApi.forEachNode((node) => {
      if (node.group && node.id && expandedRowGroupIds.includes(node.id)) {
        node.setExpanded(true);
        console.log('[GridViewManager] Expanded node:', node.id);
      }
    });
  }
}
