/* eslint-disable */
import { GridApi } from 'ag-grid-community';
import { CustomGridState } from './gridState';

export type { CustomGridState };

/**
 * Sanitizes a custom grid state by removing invalid column IDs and ensuring
 * proper data types throughout the state object.
 */
export function sanitizeGridState(
  gridState: CustomGridState,
  validColIds: Set<string>,
): CustomGridState {
  // Deep clone to avoid mutating input state
  const sanitized: CustomGridState = structuredClone(gridState);

  const removeUndefined = <T>(
    arr: (T | undefined | null)[] | undefined,
  ): T[] => {
    return (arr || []).filter(
      (item): item is T => item !== undefined && item !== null,
    );
  };

  const isValidColumn = (col: any): boolean => {
    return col && col.colId && validColIds.has(col.colId);
  };

  if (sanitized.sort?.sortModel) {
    sanitized.sort.sortModel = removeUndefined(sanitized.sort.sortModel).filter(
      isValidColumn,
    );
  }
  if (sanitized.aggregation?.aggregationModel) {
    sanitized.aggregation.aggregationModel = removeUndefined(
      sanitized.aggregation.aggregationModel,
    ).filter(isValidColumn);
  }
  if (sanitized.columnSizing?.columnSizingModel) {
    sanitized.columnSizing.columnSizingModel = removeUndefined(
      sanitized.columnSizing.columnSizingModel,
    ).filter(isValidColumn);
  }
  if (sanitized.columnOrder?.orderedColIds) {
    sanitized.columnOrder.orderedColIds = removeUndefined(
      sanitized.columnOrder.orderedColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }
  if (sanitized.columnPinning?.leftColIds) {
    sanitized.columnPinning.leftColIds = removeUndefined(
      sanitized.columnPinning.leftColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }
  if (sanitized.columnPinning?.rightColIds) {
    sanitized.columnPinning.rightColIds = removeUndefined(
      sanitized.columnPinning.rightColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }
  if (sanitized.rowGroup?.groupColIds) {
    sanitized.rowGroup.groupColIds = removeUndefined(
      sanitized.rowGroup.groupColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }
  if (sanitized.pivot?.pivotColIds) {
    sanitized.pivot.pivotColIds = removeUndefined(
      sanitized.pivot.pivotColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }
  if (sanitized.filter && sanitized.filter.filterModel) {
    const validFilterModel: any = {};
    const filterModel = sanitized.filter.filterModel;
    Object.keys(filterModel).forEach((colId) => {
      const isAutoColumn = colId.startsWith('ag-Grid-AutoColumn-');
      if (
        colId &&
        (validColIds.has(colId) || isAutoColumn) &&
        filterModel[colId] !== undefined
      ) {
        validFilterModel[colId] = filterModel[colId];
      }
    });
    sanitized.filter.filterModel = validFilterModel;
  }
  if (sanitized.columnVisibility?.hiddenColIds) {
    sanitized.columnVisibility.hiddenColIds = removeUndefined(
      sanitized.columnVisibility.hiddenColIds,
    ).filter((colId: string) => colId && validColIds.has(colId));
  }

  if (sanitized.columnGroup?.openColumnGroupIds) {
    sanitized.columnGroup.openColumnGroupIds = removeUndefined(
      sanitized.columnGroup.openColumnGroupIds,
    ).filter((groupId: string) => groupId && validColIds.has(groupId));
  }

  if (sanitized.rowGroupExpansion?.expandedRowGroupIds) {
    sanitized.rowGroupExpansion.expandedRowGroupIds = removeUndefined(
      sanitized.rowGroupExpansion.expandedRowGroupIds,
    ).filter((groupId: string) => groupId);
  }

  if (sanitized.rangeSelection?.cellRanges) {
    sanitized.rangeSelection.cellRanges = removeUndefined(
      sanitized.rangeSelection.cellRanges,
    );
  }

  if (sanitized.rowSelection && Array.isArray(sanitized.rowSelection)) {
    sanitized.rowSelection = removeUndefined(sanitized.rowSelection);
  }

  if (
    sanitized.pivot?.pivotMode !== undefined &&
    typeof sanitized.pivot.pivotMode !== 'boolean'
  ) {
    delete sanitized.pivot.pivotMode;
  }

  if (
    sanitized.expandAll !== undefined &&
    typeof sanitized.expandAll !== 'boolean'
  ) {
    sanitized.expandAll = false;
  }

  if (sanitized.pagination) {
    if (
      sanitized.pagination.page !== undefined &&
      (typeof sanitized.pagination.page !== 'number' ||
        sanitized.pagination.page < 0)
    ) {
      delete sanitized.pagination.page;
    }
    if (
      sanitized.pagination.pageSize !== undefined &&
      (typeof sanitized.pagination.pageSize !== 'number' ||
        sanitized.pagination.pageSize <= 0)
    ) {
      delete sanitized.pagination.pageSize;
    }
  }

  if (sanitized.sideBar) {
    if (
      sanitized.sideBar.visible !== undefined &&
      typeof sanitized.sideBar.visible !== 'boolean'
    ) {
      delete sanitized.sideBar.visible;
    }
    if (
      sanitized.sideBar.position !== undefined &&
      !['left', 'right'].includes(sanitized.sideBar.position)
    ) {
      delete sanitized.sideBar.position;
    }
  }

  if (sanitized.scroll) {
    if (
      sanitized.scroll.top !== undefined &&
      (typeof sanitized.scroll.top !== 'number' || sanitized.scroll.top < 0)
    ) {
      delete sanitized.scroll.top;
    }
    if (
      sanitized.scroll.left !== undefined &&
      (typeof sanitized.scroll.left !== 'number' || sanitized.scroll.left < 0)
    ) {
      delete sanitized.scroll.left;
    }
  }

  if (sanitized.focusedCell) {
    if (
      sanitized.focusedCell.colId &&
      !validColIds.has(sanitized.focusedCell.colId)
    ) {
      delete sanitized.focusedCell;
    } else if (
      sanitized.focusedCell.rowIndex !== undefined &&
      (typeof sanitized.focusedCell.rowIndex !== 'number' ||
        sanitized.focusedCell.rowIndex < 0)
    ) {
      delete sanitized.focusedCell.rowIndex;
    }
  }

  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key as keyof CustomGridState];

    if (value === undefined) {
      delete sanitized[key as keyof CustomGridState];
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const nestedObj = value as any;
      Object.keys(nestedObj).forEach((nestedKey) => {
        if (nestedObj[nestedKey] === undefined) {
          delete nestedObj[nestedKey];
        }
      });
      if (Object.keys(nestedObj).length === 0) {
        delete sanitized[key as keyof CustomGridState];
      }
    }
  });

  if (sanitized.expandAll === undefined) {
    sanitized.expandAll = false;
  }

  return sanitized;
}

export function applyGridStateHelper(
  gridApi: GridApi,
  gridState: CustomGridState,
  cleanUp?: CustomGridState,
): void {
  if (!gridApi || !gridState) {
    console.warn('GridApi or GridState is missing');
    return;
  }

  if (typeof gridApi.applyColumnState !== 'function') {
    console.error(
      'GridApi is not properly initialized or does not have required methods',
    );
    return;
  }

  try {
    const allColumns = gridApi.getColumns();
    const validColIds = new Set(allColumns?.map((col) => col.getColId()) || []);

    if (typeof gridState === 'string') {
      gridState = JSON.parse(gridState);
    }
    const sanitizedState = sanitizeGridState(gridState, validColIds);

    const isValidColumn = (col: any): boolean => {
      return col && col.colId && validColIds.has(col.colId);
    };

    const filterValidColIds = (colIds: string[] | undefined): string[] => {
      return (colIds || []).filter((colId) => colId && validColIds.has(colId));
    };

    gridApi.applyColumnState({
      defaultState: {
        rowGroup: null,
        sort: null,
        pivot: null,
        pinned: null,
        hide: null,
        aggFunc: null,
      },
    });
    gridApi.collapseAll();
    gridApi.setFilterModel(null);

    gridApi.setSideBarVisible(true);
    gridApi.setSideBarPosition('right');
    gridApi.closeToolPanel();

    gridApi.setGridOption('pivotMode', false);

    gridApi.paginationGoToPage(0);

    if (sanitizedState.rowGroup?.groupColIds !== undefined) {
      const validGroupColIds = filterValidColIds(
        sanitizedState.rowGroup.groupColIds,
      );

      if (validGroupColIds.length > 0) {
        const groupState = validGroupColIds.map((colId: string) => ({
          colId,
          rowGroup: true,
        }));
        gridApi.applyColumnState({ state: groupState });
        const allColumnsAfterGroup = gridApi.getColumns();
        validColIds.clear();
        allColumnsAfterGroup?.forEach((col) => validColIds.add(col.getColId()));
      }

      const nonGroupColIds = Array.from(validColIds).filter(
        (colId) => !validGroupColIds.includes(colId),
      );
      if (nonGroupColIds.length > 0) {
        const nonGroupState = nonGroupColIds.map((colId: string) => ({
          colId,
          rowGroup: false,
        }));
        gridApi.applyColumnState({ state: nonGroupState });
      }
    }

    if (sanitizedState.columnSizing?.columnSizingModel) {
      const columnState = sanitizedState.columnSizing.columnSizingModel
        .filter(isValidColumn)
        .map((col: any) => ({
          colId: col.colId,
          width: col.width,
          flex: col.flex,
        }));
      if (columnState.length > 0) {
        gridApi.applyColumnState({ state: columnState });
      }
    }

    if (sanitizedState.columnOrder?.orderedColIds) {
      const validColIdsArr = filterValidColIds(
        sanitizedState.columnOrder.orderedColIds,
      );
      const columnState = validColIdsArr.map(
        (colId: string, index: number) => ({
          colId,
          sortIndex: index,
        }),
      );
      if (columnState.length > 0) {
        gridApi.applyColumnState({ state: columnState, applyOrder: true });
      }
    }

    if (sanitizedState.columnPinning) {
      const pinnedState: any[] = [];

      const leftColIds = filterValidColIds(
        sanitizedState.columnPinning.leftColIds,
      );
      leftColIds.forEach((colId: string) => {
        pinnedState.push({ colId, pinned: 'left' });
      });

      const rightColIds = filterValidColIds(
        sanitizedState.columnPinning.rightColIds,
      );
      rightColIds.forEach((colId: string) => {
        pinnedState.push({ colId, pinned: 'right' });
      });

      if (pinnedState.length > 0) {
        gridApi.applyColumnState({ state: pinnedState });
      }
    }

    if (sanitizedState.sort?.sortModel) {
      const validSortModel = sanitizedState.sort.sortModel
        .filter(
          (sort: any) => sort && sort.colId && validColIds.has(sort.colId),
        )
        .map((sort: any) => ({
          colId: sort.colId,
          sort: sort.sort,
          sortIndex: sort.sortIndex,
        }));
      if (validSortModel.length > 0) {
        gridApi.applyColumnState({
          state: validSortModel,
          defaultState: { sort: null },
        });
      }
    }

    if (sanitizedState.filter?.filterModel) {
      const validFilterModel: any = {};
      const filterModel = sanitizedState.filter.filterModel;
      Object.keys(filterModel).forEach((colId) => {
        const isAutoColumn = colId.startsWith('ag-Grid-AutoColumn-');
        const isValid = isAutoColumn || validColIds.has(colId);
        if (isValid) {
          validFilterModel[colId] = filterModel[colId];
        }
      });
      if (Object.keys(validFilterModel).length > 0) {
        gridApi.setFilterModel(validFilterModel);
      } else {
        gridApi.setFilterModel(null);
      }
    } else {
      gridApi.setFilterModel(null);
    }

    if (sanitizedState.pivot?.pivotColIds) {
      const validPivotColIds = filterValidColIds(
        sanitizedState.pivot.pivotColIds,
      );
      const pivotState = validPivotColIds.map((colId: string) => ({
        colId,
        pivot: true,
      }));
      if (pivotState.length > 0) {
        gridApi.applyColumnState({ state: pivotState });
      }
    }

    if (sanitizedState.aggregation?.aggregationModel) {
      const validAggModel = sanitizedState.aggregation.aggregationModel
        .filter((agg: any) => agg && agg.colId && validColIds.has(agg.colId))
        .map((agg: any) => ({
          colId: agg.colId,
          aggFunc: agg.aggFunc,
        }));
      if (validAggModel.length > 0) {
        gridApi.applyColumnState({ state: validAggModel });
      }
    }

    if (sanitizedState.sideBar?.visible !== undefined) {
      gridApi.setSideBarVisible(sanitizedState.sideBar.visible);
    }

    if (sanitizedState.sideBar?.position) {
      gridApi.setSideBarPosition(
        sanitizedState.sideBar.position as 'left' | 'right',
      );
    }

    if (sanitizedState.sideBar?.openToolPanel) {
      gridApi.openToolPanel(sanitizedState.sideBar.openToolPanel);
    }

    if (sanitizedState.pagination?.page !== undefined) {
      gridApi.paginationGoToPage(sanitizedState.pagination.page);
    }

    if (sanitizedState.pagination?.pageSize !== undefined) {
      gridApi.setGridOption('paginationPageSize', sanitizedState.pagination.pageSize);
    }

    if (sanitizedState.pivot?.pivotMode !== undefined) {
      gridApi.setGridOption('pivotMode', sanitizedState.pivot.pivotMode);
    }

    if (sanitizedState.columnGroup?.openColumnGroupIds) {
      sanitizedState.columnGroup.openColumnGroupIds.forEach(
        (groupId: string) => {
          gridApi.setColumnGroupOpened(groupId, true);
        },
      );
    }

    if (!sanitizedState.rowGroupExpansion?.expandedRowGroupIds) {
      gridApi.collapseAll();
    }

    if (sanitizedState.columnVisibility?.hiddenColIds !== undefined) {
      const validHidden = filterValidColIds(
        sanitizedState.columnVisibility.hiddenColIds,
      );

      if (validHidden.length > 0) {
        gridApi.setColumnsVisible(validHidden, false);
      }

      const allVisibleColIds = Array.from(validColIds).filter(
        (colId) => !validHidden.includes(colId),
      );
      if (allVisibleColIds.length > 0) {
        gridApi.setColumnsVisible(allVisibleColIds, true);
      }
    }

    if (sanitizedState.focusedCell && sanitizedState.focusedCell.colId) {
      gridApi.setFocusedCell(
        sanitizedState.focusedCell.rowIndex || 0,
        sanitizedState.focusedCell.colId,
        sanitizedState.focusedCell.rowPinned || null,
      );
    }
  } catch (error) {
    console.error('Error applying grid state:', error);
  }
}

/**
 * Deterministic JSON serialization with sorted object keys.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    return (
      '{' +
      keys
        .map(
          (k) =>
            JSON.stringify(k) +
            ':' +
            stableStringify((value as Record<string, unknown>)[k]),
        )
        .join(',') +
      '}'
    );
  }
  const serialized = JSON.stringify(value);
  return serialized ?? 'null';
}

/**
 * Returns true when two grid states are semantically equivalent.
 */
export function areGridStatesEqual(
  a: CustomGridState,
  b: CustomGridState,
  validColIds: Set<string>,
): boolean {
  return (
    stableStringify(sanitizeGridState(a, validColIds)) ===
    stableStringify(sanitizeGridState(b, validColIds))
  );
}

/**
 * Returns an empty grid state object with all properties initialized to empty values.
 */
export function getEmptyGridState(): CustomGridState {
  return {
    sideBar: {
      visible: true,
      position: 'right',
      openToolPanel: 'columns',
      toolPanels: {
        columns: { expandedGroupIds: [] },
        filters: { expandedGroupIds: [], expandedColIds: [] },
      },
    },
    sort: { sortModel: [] },
    aggregation: { aggregationModel: [] },
    columnPinning: { leftColIds: [], rightColIds: [] },
    columnSizing: { columnSizingModel: [] },
    columnOrder: { orderedColIds: [] },
    filter: { filterModel: {}, advancedFilterModel: undefined },
    rowGroup: { groupColIds: [] },
    pivot: { pivotMode: false, pivotColIds: [] },
    pagination: { page: 0, pageSize: undefined },
    focusedCell: { colId: undefined, rowIndex: undefined, rowPinned: null },
    columnVisibility: { hiddenColIds: [] },
    columnGroup: { openColumnGroupIds: [] },
    rowGroupExpansion: { expandedRowGroupIds: [] },
    rangeSelection: { cellRanges: [] },
    scroll: { top: 0, left: 0 },
    rowSelection: [],
    expandAll: false,
  };
}
