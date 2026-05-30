/* eslint-disable */
import { AdvancedFilterModel, GridApi } from '@ag-grid-community/core';
import { CustomGridState } from './gridState';

export type { CustomGridState };

/**
 * Applies a custom grid state to the AG Grid instance.
 * This helper function restores saved grid configuration including:
 * - Column order, sizing, and pinning
 * - Sort model
 * - Filter model
 * - Sidebar visibility
 * - Aggregation settings
 * - Row grouping
 * - Pivot configuration
 * - Pagination state
 */
export function sanitizeGridState(
  gridState: CustomGridState,
  validColIds: Set<string>,
): CustomGridState {
  // Deep clone to avoid mutating immutable NgRx state
  const sanitized: CustomGridState = structuredClone(gridState);

  const removeUndefined = <T>(
    arr: (T | undefined | null)[] | undefined,
  ): T[] => {
    return (arr || []).filter(
      (item): item is T => item !== undefined && item !== null,
    );
  };

  // Helper function to remove undefined/null values and validate column objects
  const isValidColumn = (col: any): boolean => {
    return col && col.colId && validColIds.has(col.colId);
  };

  // Remove nulls and invalids from arrays, and filter out undefined values
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

  // Sanitize columnGroup.openColumnGroupIds (filter invalid group IDs and remove undefined)
  if (sanitized.columnGroup?.openColumnGroupIds) {
    sanitized.columnGroup.openColumnGroupIds = removeUndefined(
      sanitized.columnGroup.openColumnGroupIds,
    ).filter((groupId: string) => groupId && validColIds.has(groupId));
  }

  // Sanitize rowGroupExpansion.expandedRowGroupIds (only remove undefined, don't validate against colIds)
  // These are data row identifiers, not column IDs
  if (sanitized.rowGroupExpansion?.expandedRowGroupIds) {
    sanitized.rowGroupExpansion.expandedRowGroupIds = removeUndefined(
      sanitized.rowGroupExpansion.expandedRowGroupIds,
    ).filter((groupId: string) => groupId);
  }

  // Remove undefined values from range selection
  if (sanitized.rangeSelection?.cellRanges) {
    sanitized.rangeSelection.cellRanges = removeUndefined(
      sanitized.rangeSelection.cellRanges,
    );
  }

  // Remove undefined values from row selection
  if (sanitized.rowSelection && Array.isArray(sanitized.rowSelection)) {
    sanitized.rowSelection = removeUndefined(sanitized.rowSelection);
  }

  // Sanitize pivot mode - ensure it's a boolean
  if (
    sanitized.pivot?.pivotMode !== undefined &&
    typeof sanitized.pivot.pivotMode !== 'boolean'
  ) {
    delete sanitized.pivot.pivotMode;
  }

  // Sanitize expandAll - ensure it's a boolean
  if (
    sanitized.expandAll !== undefined &&
    typeof sanitized.expandAll !== 'boolean'
  ) {
    sanitized.expandAll = false;
  }

  // Sanitize pagination values - ensure they're valid numbers
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

  // Sanitize sidebar values
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

  // Sanitize scroll values - ensure they're valid numbers
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

  // Sanitize focused cell - validate structure and column ID
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

  // Clean up nested undefined values within objects
  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key as keyof CustomGridState];

    // Remove top-level undefined properties
    if (value === undefined) {
      delete sanitized[key as keyof CustomGridState];
    }
    // Clean up nested undefined properties within objects (but keep the parent if it has valid data)
    else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const nestedObj = value as any;
      // Remove undefined properties from nested objects
      Object.keys(nestedObj).forEach((nestedKey) => {
        if (nestedObj[nestedKey] === undefined) {
          delete nestedObj[nestedKey];
        }
      });
      // Only remove the parent if it has no properties left
      if (Object.keys(nestedObj).length === 0) {
        delete sanitized[key as keyof CustomGridState];
      }
    }
  });

  // Ensure expandAll has a default value if it's missing
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
    // Get all valid column IDs from the grid
    const allColumns = gridApi.getColumns();
    const validColIds = new Set(allColumns?.map((col) => col.getColId()) || []);

    if (typeof gridState === 'string') {
      gridState = JSON.parse(gridState);
    }
    // Sanitize the grid state before applying
    const sanitizedState = sanitizeGridState(gridState, validColIds);

    // Helper function to validate column objects
    const isValidColumn = (col: any): boolean => {
      return col && col.colId && validColIds.has(col.colId);
    };

    // Helper function to filter valid column IDs
    const filterValidColIds = (colIds: string[] | undefined): string[] => {
      return (colIds || []).filter((colId) => colId && validColIds.has(colId));
    };

    // Clear all existing state that could interfere with new state application
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

    // Reset sidebar to default state
    gridApi.setSideBarVisible(true);
    gridApi.setSideBarPosition('right');
    gridApi.closeToolPanel();

    // Reset pivot mode
    gridApi.setGridOption('pivotMode', false);

    // Reset pagination to first page
    gridApi.paginationGoToPage(0);

    // Apply row grouping - handle both setting groups and removing all groups
    if (sanitizedState.rowGroup?.groupColIds !== undefined) {
      const validGroupColIds = filterValidColIds(
        sanitizedState.rowGroup.groupColIds,
      );

      // If there are columns to group, apply grouping
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

      // Always clear row grouping from all columns not in the group list
      // This handles both adding groups and removing all groups
      const nonGroupColIds = Array.from(validColIds).filter(
        (colId) => !validGroupColIds.includes(colId),
      );
      if (nonGroupColIds.length > 0) {
        const nonGroupState = nonGroupColIds.map((colId: string) => ({
          colId,
          rowGroup: false, // Use false instead of undefined to explicitly remove grouping
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
      // Filter out invalid column filters
      // Allow auto-generated columns (ag-Grid-AutoColumn-*) to pass through
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

    if (sanitizedState.filter?.advancedFilterModel) {
      // Apply advanced filter model if available
      try {
        if (typeof gridApi.setAdvancedFilterModel === 'function') {
          gridApi.setAdvancedFilterModel(
            sanitizedState.filter
              .advancedFilterModel as AdvancedFilterModel | null,
          );
        }
      } catch (error) {
        console.warn('Failed to apply advanced filter model:', error);
      }
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
      gridApi.paginationSetPageSize(sanitizedState.pagination.pageSize);
    }

    if (sanitizedState.pivot?.pivotMode !== undefined) {
      gridApi.setGridOption('pivotMode', sanitizedState.pivot.pivotMode);
    }

    if (sanitizedState.columnGroup?.openColumnGroupIds) {
      // Apply column group expansion state
      sanitizedState.columnGroup.openColumnGroupIds.forEach(
        (groupId: string) => {
          gridApi.setColumnGroupOpened(groupId, true);
        },
      );
    }

    if (sanitizedState.rowGroupExpansion?.expandedRowGroupIds) {
      // Apply row group expansion state - requires row IDs to be available
      // This is typically handled by the grid automatically when data loads
      console.log(
        'Row group expansion state available but requires data to be loaded first',
      );
    } else {
      gridApi.collapseAll();
    }

    // if (sanitizedState.expandAll !== undefined) {
    //   // Expand or collapse all row groups based on the expandAll state
    //   if (sanitizedState.expandAll) {
    //     gridApi.expandAll();
    //   } else {
    //     gridApi.collapseAll();
    //   }
    // }

    // if (sanitizedState.scroll) {
    //   // Apply scroll position
    //   if (sanitizedState.scroll.top !== undefined) {
    //     gridApi.ensureIndexVisible(sanitizedState.scroll.top, 'top');
    //   }
    //   if (sanitizedState.scroll.left !== undefined) {
    //     gridApi.ensureColumnVisible(sanitizedState.scroll.left as any);
    //   }
    // }

    if (sanitizedState.columnVisibility?.hiddenColIds !== undefined) {
      const validHidden = filterValidColIds(
        sanitizedState.columnVisibility.hiddenColIds,
      );

      // Hide the specified columns
      if (validHidden.length > 0) {
        gridApi.setColumnsVisible(validHidden, false);
      }

      // Explicitly show all other columns (important for tool panel to reflect state correctly)
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

    // if (
    //   sanitizedState.rangeSelection?.cellRanges &&
    //   sanitizedState.rangeSelection.cellRanges.length > 0
    // ) {
    //   // TODO Apply range selection (cell ranges)
    // }

    // if (sanitizedState.rowSelection !== undefined) {
    //   // TODO Apply row selection
    // }
  } catch (error) {
    console.error('Error applying grid state:', error);
  }
}

/**
 * Deterministic JSON serialization with sorted object keys.
 * Ensures structurally equivalent objects produce identical strings
 * regardless of property insertion order.
 *
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
 * Both states are sanitized (normalised and cleaned) against the same
 * set of valid column IDs before comparison, so structural noise such
 * as invalid/removed columns, undefined values, and key-ordering
 * differences are ignored.
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
