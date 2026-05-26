import {
  ColDef,
  FirstDataRenderedEvent,
  GridOptions,
  ProcessCellForExportParams,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { ExcelStyle, InitialGroupOrderComparatorParams } from 'ag-grid-community';
import { AllocationRenderComponent } from '../trades-grid/cell-renderers/allocation-render.component';
import { ExecutionModel, TradeModel } from '@trade-platform/exac/shared/data';
import { isTradeCancelled } from '../trades-grid/menu-utils';

export const defaultGridOptions: GridOptions<TradeModel | ExecutionModel> = {
  enableCharts: true,
  suppressAggFuncInHeader: true,
  headerHeight: 35,
  embedFullWidthRows: false,
  tooltipShowDelay: 0,
  rowSelection: 'multiple',
  isRowSelectable: (node) => !!node.data && !isTradeCancelled(node.data),
  groupSelectsChildren: true,
  groupSelectsFiltered: false,
  animateRows: true,
  debounceVerticalScrollbar: true,
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
};

export const defaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  flex: 1,
  floatingFilter: true,
  suppressHeaderMenuButton: true,
  enableRowGroup: true,
};

export const autoGroupColumnDef: ColDef = {
  resizable: true,
  cellStyle: { textAlign: 'left' },
  editable: (params) => !!params.node.group,
  enablePivot: true,
  lockPinned: true,
  lockPosition: true,
  suppressMovable: true,
  pinned: 'left',
  minWidth: 100,
  maxWidth: 250,
  cellRenderer: 'agGroupCellRenderer',
  sortable: true,
  cellRendererParams: {
    suppressCount: true,
    suppressDoubleClickExpand: true,
    innerRenderer: AllocationRenderComponent,
  },
};

export const initialGroupOrderComparator: (
  params: InitialGroupOrderComparatorParams,
) => number = (params: InitialGroupOrderComparatorParams) => {
  const a = params.nodeA.key ?? '';
  const b = params.nodeB.key ?? '';
  if (a === '') return 1;
  if (b === '') return -1;
  if (a < b) return -1;
  return a > b ? 1 : 0;
};

export const excelStyles: ExcelStyle[] = [
  {
    id: 'dateISO',
    dataType: 'DateTime',
    numberFormat: { format: 'yyy-mm-dd' },
  },
];

export const booleanColumnDisplayColumnDef: any = {
  cellDataType: false,
  valueFormatter: (params: ValueFormatterParams) => {
    if (params.value === null || params.value === undefined) return '';
    return params.value === true || params.value === 'Y' ? 'Y' : 'N';
  },
  filterValueGetter: (params: ValueGetterParams<unknown>) => {
    const val = params.getValue(params.column.getColId()) as unknown;
    if (val === null || val === undefined) return '';
    return val === true || val === 'Y' ? 'Y' : 'N';
  },
};

export function createTradesGridOptions(
  callbacks: {
    onFirstDataRendered?: (params: FirstDataRenderedEvent) => void;
    onRowClicked?: (event: any) => void;
    onSelectionChanged?: () => void;
    onColumnRowGroupChanged?: () => void;
    onCellMouseDown?: (event: any) => void;
    onColumnPinned?: () => void;
  },
  dependencies: {
    loadingOverlayComponent?: any;
    processDates?: (params: any) => any;
    formatAmountForExport?: (
      params: ProcessCellForExportParams,
    ) => string | undefined;
    aggFuncs?: Record<string, any>;
  },
): Record<string, unknown> {
  return {
    ...defaultGridOptions,
    loadingOverlayComponent: dependencies.loadingOverlayComponent,
    processCellForClipboard: dependencies.processDates,
    excelStyles: excelStyles,
    aggFuncs: dependencies.aggFuncs,
    initialGroupOrderComparator: initialGroupOrderComparator,
    onFirstDataRendered: callbacks.onFirstDataRendered,
    enableCharts: true,
    onRowClicked: callbacks.onRowClicked,
    defaultExcelExportParams: {
      processCellCallback: dependencies.formatAmountForExport,
    },
    defaultCsvExportParams: {
      processCellCallback: dependencies.formatAmountForExport,
    },
    onSelectionChanged: callbacks.onSelectionChanged,
    onColumnRowGroupChanged: callbacks.onColumnRowGroupChanged,
    onCellMouseDown: callbacks.onCellMouseDown,
    onColumnPinned: callbacks.onColumnPinned,
  };
}
