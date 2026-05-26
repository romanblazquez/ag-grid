import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { MatDialog } from '@angular/material/dialog';
import {
  CellMouseDownEvent,
  CheckboxSelectionCallbackParams,
  ColDef,
  FirstDataRenderedEvent,
  GridApi,
  GridReadyEvent,
  MenuItemDef,
} from 'ag-grid-community';
import { BehaviorSubject, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import {
  TradesGridFacade,
  ExecutionsGridFacade,
} from '@trade-platform/exac/trades-grid/data-access';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { ActivatedRoute, Params } from '@angular/router';
import { GridView, gridViewQParams } from '@trade-platform/exac/shared/data';
import {
  HarmonixService,
  setWorkspaceContext,
  TradeContext,
} from '@trade-platform/shared/data-access';
import {
  ClickNode,
  createTradeContext,
  EventData,
  getAdditionalMenuItems,
  handleContextMenuSelection,
} from './menu-utils';
import { createAggFunctions } from './grid-aggregations-utils';
import { formatAmountForExport, processDates } from './grid-export-utils';
import {
  createAllocationColumn,
  createCheckboxColumn,
  ensureColumnOrder,
  handleCopyTradeBlockAndExecutionId,
} from './grid-column-utils';
import {
  autoGroupColumnDef,
  createTradesGridOptions,
  defaultColDef,
} from '../column-definitions/shared-definition-options';
import { ExecutionModel, TradeModel } from '@trade-platform/exac/shared/data';
import { GridOptions, RowClickedEvent } from 'ag-grid-community';
import { IprefName } from '@trade-platform/exac/trades-grid/data';
import { AllocationDetailRendererComponent } from '../allocation-detail-renderer/allocation-detail-renderer.component';
import { AllocationRenderComponent } from './cell-renderers/allocation-render.component';
import {
  CancelOutrightComponent,
  CancelResult,
  MultiCancelDialogData,
  UpdateTraderNoteComponent,
  UpdateTraderNoteDialogData,
  UpdateTraderNoteResult,
} from '@trade-platform/exac/shared/ui';
import { getTradesColumnDef } from '../column-definitions/trades-column-defs';
import { PersonCacheService } from '@trade-platform/shared/data-access';
import { getExecutionsColumnDef } from '../column-definitions/executions-column-defs';

@Component({
  selector: 'tp-trades-grid',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './trades-grid.component.html',
  styleUrl: './trades-grid.component.scss',
})
export class TradesGridComponent implements OnInit, OnDestroy {
  @Input() public cancelAndAdjustServiceUrl = '/api/xa/service/cancel/%TYPE%';

  public gridApi!: GridApi;
  public expand: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isGridLoading = true;
  public enablePivot = false;
  public title = 'Fund Executions';
  public retainSelectionOnGrouping = true;
  public additionalMenuItems: (string | MenuItemDef)[] = [];
  public isGrouped$ = new BehaviorSubject<boolean>(false);

  public aggFuncs = createAggFunctions();
  public isExecutionsContext = false;
  public iPrefAppName = IprefName.Trades;
  public detailCellRenderer = AllocationDetailRendererComponent;
  public currentlyExpandedRowId = '';
  public defaultColDef = defaultColDef;
  public gridOptions: GridOptions<TradeModel | ExecutionModel> =
    createTradesGridOptions(
      {
        onFirstDataRendered: (params: FirstDataRenderedEvent): void =>
          this.onFirstDataRendered(params),
        onRowClicked: (event: RowClickedEvent<TradeModel | ExecutionModel>) =>
          this.onRowClicked(event),
        onSelectionChanged: () => {
          this.updateAdditionalMenuItems();
        },
        onColumnRowGroupChanged: () => {
          if (this.gridApi) {
            this.isGrouped$.next(this.gridApi.getRowGroupColumns().length > 0);
            this.isGrouped$.subscribe((isGrouped: boolean) => {
              this.gridApi.setColumnsVisible(
                ['checkbox', 'allocations'],
                !isGrouped,
              );
            });
            if (!this.retainSelectionOnGrouping) {
              this.gridApi.deselectAll();
            }
          }
        },
        onCellMouseDown: (event: CellMouseDownEvent) => {
          const evt = event.event;
          if (evt instanceof MouseEvent && evt.button === 2) {
            this.handleContextMenuSelection({ node: event.node });
          }
        },
        onColumnPinned: () => {
          if (this.gridApi) {
            setTimeout(() => ensureColumnOrder(this.gridApi), 0);
          }
        },
      },
      {
        loadingOverlayComponent: LoadingOverlayComponent,
        processDates: processDates,
        formatAmountForExport: formatAmountForExport,
        aggFuncs: this.aggFuncs,
      },
    ) as GridOptions<TradeModel | ExecutionModel>;

  public autoGroupColumnDef = {
    ...autoGroupColumnDef,
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true,
    suppressMovable: true,
    lockPosition: true,
    pinned: 'left' as const,
    cellRendererParams: {
      suppressCount: false,
      innerRenderer: AllocationRenderComponent,
    },
    checkboxSelection: (
      params: CheckboxSelectionCallbackParams<TradeModel | ExecutionModel, unknown>,
    ) => {
      const firstGroupColFId = this.gridApi
        .getRowGroupColumns()[0]
        ?.getColDef()?.colId;
      return params.colDef.colId === `ag-Grid-AutoColumn-${firstGroupColFId}`;
    },
    cellClass: (params: { colDef: ColDef }) => {
      const firstGroupColFId = this.gridApi
        .getRowGroupColumns()[0]
        ?.getColDef()?.colId;
      return params.colDef.colId === `ag-Grid-AutoColumn-${firstGroupColFId}`
        ? null
        : 'not-first-group-col';
    },
    showDisabledCheckboxes: true,
  };

  public columnDefs: ColDef[] = [];

  /** Computed signal — returns 'dark' theme string based on harmonix theme signal */
  public readonly isDarkTheme = computed(
    () => this.harmonixService.theme().name === 'dark',
  );

  private readonly destroy$ = new Subject<void>();

  /**
   * Pre-created observables from signals so that toObservable() is called
   * during construction (inside the injection context) rather than inside
   * a switchMap callback where the injection context is no longer active.
   * Initialized in the constructor body after DI has set the facade fields.
   */
  private readonly tradesIsLoading$: Observable<boolean>;
  private readonly executionsIsLoading$: Observable<boolean>;

  public constructor(
    private readonly route: ActivatedRoute,
    private readonly tradesFacade: TradesGridFacade,
    private readonly executionsFacade: ExecutionsGridFacade,
    private readonly harmonixService: HarmonixService,
    private readonly dialog: MatDialog,
    private readonly personCacheService: PersonCacheService,
  ) {
    // toObservable requires an active injection context. The constructor body
    // runs inside Angular's injection context, so it is safe to call here.
    this.tradesIsLoading$ = toObservable(this.tradesFacade.isLoadingData);
    this.executionsIsLoading$ = toObservable(
      this.executionsFacade.isLoadingData,
    );
  }

  public get isGrouped(): boolean {
    return this.gridApi.getRowGroupColumns().length > 0;
  }

  /**
   * Expose row data as a method for template binding.
   * Returns the current trade or execution data from the active context.
   */
  public rowData(): (TradeModel | ExecutionModel)[] | null {
    if (this.isExecutionsContext) {
      return this.executionsFacade.executions();
    }
    return this.tradesFacade.trades();
  }

  /** CTRL+I copies trade/execution ID of selected rows */
  @HostListener('document:keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    handleCopyTradeBlockAndExecutionId(
      this.gridApi,
      event,
      this.isExecutionsContext,
    );
  }

  public onRowClicked(
    event: RowClickedEvent<TradeModel | ExecutionModel>,
  ): void {
    const data = event.data;
    if (!data) {
      console.warn('Row clicked with no data:', event);
      return;
    }

    const entityId = this.isExecutionsContext
      ? (data as ExecutionModel).executionId
      : (data as TradeModel).entityId;

    if (!entityId) {
      console.warn('Row clicked without valid entityId or executionId:', data);
      return;
    }

    const eventData: EventData = { data, entityId };
    const context: TradeContext = this.contextItem(eventData);
    setWorkspaceContext(this.harmonixService, context);
  }

  public ngOnInit(): void {
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params: Params): Observable<boolean> => {
          if (params[gridViewQParams] === GridView.Executions) {
            this.initExecutionsContext();
          } else {
            this.initTradesContext();
            this.updateAdditionalMenuItems();
          }
          // Use pre-created observables (toObservable called in constructor context).
          return this.isExecutionsContext
            ? this.executionsIsLoading$
            : this.tradesIsLoading$;
        }),
      )
      .subscribe((isLoading: boolean) => {
        this.showOverlay(isLoading);
      });
  }

  public onFirstDataRendered(params: FirstDataRenderedEvent): void {
    if (this.enablePivot) {
      params.api.createPivotChart({
        chartType: 'stackedColumn',
        chartContainer: document.querySelector('#myChart') as HTMLElement,
        chartThemeOverrides: {
          common: {
            navigator: { enabled: true, height: 10 },
          },
        },
      });
      requestAnimationFrame(() => {
        params.api.getDisplayedRowAtIndex(2)?.setExpanded(true);
      });
    }
  }

  public onGridReady(grid: GridReadyEvent): void {
    this.gridApi = grid.api;
    ensureColumnOrder(this.gridApi);
    this.isGridLoading = false;

    const initialGroupingState = this.gridApi.getRowGroupColumns().length > 0;
    this.isGrouped$.next(initialGroupingState);
    this.gridApi.setColumnsVisible(
      ['checkbox', 'allocations'],
      !initialGroupingState,
    );
  }

  public toggleRetainSelection(): void {
    this.retainSelectionOnGrouping = !this.retainSelectionOnGrouping;
  }

  private updateAdditionalMenuItems(): void {
    const selectedCount = this.gridApi?.getSelectedNodes()?.length ?? 0;
    const selectedType: 'trade' | 'execution' = this.isExecutionsContext
      ? 'execution'
      : 'trade';
    this.additionalMenuItems = getAdditionalMenuItems(
      this.harmonixService,
      (event: { data: EventData }) => this.contextItem(event.data),
      selectedCount,
      () => this.openCancelDialog(),
      selectedType,
      () => this.openUpdateNoteDialog(),
    ) as (string | MenuItemDef)[];
  }

  private handleContextMenuSelection(params: { node: any }): void {
    handleContextMenuSelection(params.node as ClickNode);
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public openCancelDialog(): void {
    const selectedNodes = this.gridApi.getSelectedNodes();
    const selectedTrades: TradeModel[] = [];
    const selectedExecutions: ExecutionModel[] = [];

    selectedNodes.forEach((node) => {
      if (node.data) {
        if (this.isExecutionsContext) {
          selectedExecutions.push(node.data as ExecutionModel);
        } else {
          selectedTrades.push(node.data as TradeModel);
        }
      }
    });

    const cancelType: 'trades' | 'executions' | 'mixed' = this.isExecutionsContext
      ? 'executions'
      : selectedTrades.length > 0 && selectedExecutions.length > 0
        ? 'mixed'
        : selectedTrades.length > 0
          ? 'trades'
          : 'executions';

    const dialogData: MultiCancelDialogData = {
      selectedTrades,
      selectedExecutions,
      cancelType,
      cancelServiceUrl: this.cancelAndAdjustServiceUrl,
    };

    const dialogRef = CancelOutrightComponent.open(this.dialog, dialogData, {
      width: '600px',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: CancelResult | undefined) => {
        if (result?.success) {
          console.log('Cancel operation completed successfully:', result);
        }
      });
  }

  public openUpdateNoteDialog(): void {
    const selectedNodes = this.gridApi.getSelectedNodes();
    const selectedExecutions: ExecutionModel[] = [];

    selectedNodes.forEach((node) => {
      if (node.data && this.isExecutionsContext) {
        selectedExecutions.push(node.data as ExecutionModel);
      }
    });

    if (selectedExecutions.length === 0) return;

    const dialogData: UpdateTraderNoteDialogData = {
      executions: selectedExecutions,
      changeServiceUrl: this.cancelAndAdjustServiceUrl,
    };

    const dialogRef = this.dialog.open<
      UpdateTraderNoteComponent,
      UpdateTraderNoteDialogData,
      UpdateTraderNoteResult
    >(UpdateTraderNoteComponent, {
      width: '600px',
      data: dialogData,
      disableClose: false,
      panelClass: 'cancel-dialog-container',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        console.log(
          `Successfully updated trader notes for ${result.updatedCount} execution(s)`,
        );
      } else if (result?.error) {
        console.error('Failed to update trader notes:', result.error);
      }
    });
  }

  private contextItem(eventData: EventData): TradeContext {
    return createTradeContext(eventData);
  }

  private initExecutionsContext(): void {
    this.title = 'Block Executions';
    this.isExecutionsContext = true;
    this.iPrefAppName = IprefName.Executions;
    this.columnDefs = this.getColumnDefs(
      getExecutionsColumnDef(this.personCacheService),
    );
    this.enableMasterDetailAllocations();
    this.updateAdditionalMenuItems();
  }

  private initTradesContext(): void {
    this.columnDefs = this.getColumnDefs(
      getTradesColumnDef(this.personCacheService),
    );
  }

  private enableMasterDetailAllocations(): void {
    this.gridOptions = {
      ...this.gridOptions,
      masterDetail: true,
      keepDetailRows: false,
      detailCellRenderer: this.detailCellRenderer,
      embedFullWidthRows: false,
      groupDefaultExpanded: 0,
      detailCellRendererParams: {
        suppressCallback: (params: { node: { group: boolean } }) => {
          return params.node.group;
        },
      },
    };

    this.isGrouped$.subscribe((isGrouped: boolean) => {
      if (!isGrouped) {
        this.insertAllocationColumn();
      } else {
        this.gridApi.setColumnsVisible(['checkbox', 'allocations'], false);
      }
    });
  }

  private insertAllocationColumn(): void {
    const allocationCol = createAllocationColumn();
    const checkboxIndex = this.columnDefs.findIndex(
      (col) => col.colId === 'checkbox',
    );

    if (checkboxIndex >= 0) {
      this.columnDefs.splice(checkboxIndex + 1, 0, allocationCol);
    } else {
      this.columnDefs.unshift(allocationCol);
    }
  }

  private getColumnDefs(baseDefs: ColDef[]): ColDef[] {
    return [createCheckboxColumn(), ...baseDefs];
  }

  private showOverlay(isLoading: boolean): void {
    if (isLoading) {
      this.gridApi?.showLoadingOverlay();
    } else {
      this.gridApi?.hideOverlay();
    }
  }
}
