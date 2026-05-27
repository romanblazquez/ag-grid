export interface CustomGridState {
  sideBar?: {
    visible?: boolean;
    position?: string;
    openToolPanel?: string | null;
    toolPanels?: unknown;
    defaultToolPanel?: string;
  };
  sort?: {
    sortModel?: unknown[];
  };
  aggregation?: {
    aggregationModel?: unknown[];
  };
  columnPinning?: {
    leftColIds?: string[];
    rightColIds?: string[];
  };
  columnSizing?: {
    columnSizingModel?: unknown[];
  };
  columnOrder?: {
    orderedColIds?: string[];
  };
  filter?: {
    filterModel?: Record<string, unknown>;
    advancedFilterModel?: unknown;
  };
  rowGroup?: {
    groupColIds?: string[];
  };
  pivot?: {
    pivotMode?: boolean;
    pivotColIds?: string[];
  };
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  focusedCell?: {
    colId?: string;
    rowIndex?: number;
    rowPinned?: 'top' | 'bottom' | null;
  };
  columnVisibility?: {
    hiddenColIds?: string[];
  };
  columnGroup?: {
    openColumnGroupIds?: string[];
  };
  rowGroupExpansion?: {
    expandedRowGroupIds?: string[];
  };
  rangeSelection?: {
    cellRanges?: unknown[];
  };
  scroll?: {
    top?: number;
    left?: number;
  };
  rowSelection?: string[] | unknown;
  expandAll?: boolean;
}
