import { ColDef, GridApi, IRowNode } from 'ag-grid-community';
import { defaultColDef } from '../column-definitions/shared-definition-options';
import { ExecutionModel, TradeModel } from '@trade-platform/exac/shared/data';
import {
  fallbackCopy,
  flashAffectedRows,
} from '@trade-platform/shared/data-access';

const commonColDef: ColDef = {
  ...defaultColDef,
  flex: 1,
  pinned: 'left',
  width: 50,
  minWidth: 30,
  maxWidth: 50,
  headerName: '',
  lockPosition: true,
  lockPinned: true,
  suppressMovable: true,
  suppressSizeToFit: true,
  enableCellChangeFlash: false,
  resizable: false,
  filter: false,
  suppressColumnsToolPanel: false,
};

export function createCheckboxColumn(): ColDef {
  return {
    ...commonColDef,
    colId: 'checkbox',
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true,
    checkboxSelection: true,
    showDisabledCheckboxes: true,
    field: 'checkbox',
    suppressNavigable: true,
    filter: false,
  };
}

export function createAllocationColumn(): ColDef {
  return {
    ...commonColDef,
    colId: 'allocations',
    field: 'allocations',
    cellRenderer: 'agGroupCellRenderer',
    suppressHeaderMenuButton: true,
  };
}

export function ensureColumnOrder(gridApi: GridApi): void {
  const specialColumnOrder = ['checkbox', 'allocations'];

  const existingSpecialColumns = specialColumnOrder.filter((colId) =>
    gridApi.getColumn(colId),
  );
  if (existingSpecialColumns.length === 0) return;

  const allColumns = gridApi.getAllDisplayedColumns();
  const leftPinnedColumns = allColumns.filter(
    (col) => col.getPinned() === 'left',
  );

  const specialColumnPositions = existingSpecialColumns.map((colId) => {
    const column = gridApi.getColumn(colId);
    return leftPinnedColumns.findIndex((col) => col === column);
  });

  const needsReordering = !specialColumnPositions.every(
    (pos, index) => pos === index,
  );

  if (needsReordering) {
    gridApi.moveColumns(existingSpecialColumns, 0);
  }
}

export function handleCopyTradeBlockAndExecutionId(
  gridApi: GridApi,
  event: KeyboardEvent,
  isExecutionContext: boolean,
): void {
  if (event.ctrlKey && event.key === 'i') {
    event.preventDefault();
    const selectedNodes = gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) {
      const elementType = isExecutionContext ? 'execution' : 'trade';
      console.log(`No ${elementType} is selected, can't copy`);
      return;
    }
    let result = '';
    for (const selectedNode of selectedNodes) {
      let text;
      if (isExecutionContext) {
        text = extractExecutionBlockIdFromExecution(selectedNode);
      } else {
        text = extractTradeExecutionIdFromTrade(selectedNode);
      }
      result += text;
    }

    navigator.clipboard.writeText(result).catch(() => fallbackCopy(result));

    if (result.length > 0) {
      flashAffectedRows(selectedNodes, gridApi);
    }
  }
}

function extractTradeExecutionIdFromTrade(focused: IRowNode): string {
  const trade: TradeModel = focused.data as TradeModel;
  const tradeId = trade.entityId;
  const executionId = trade.execId ?? 'N/A';
  return `TradeId=${tradeId}, ExecutionId=${executionId}\n`;
}

function extractExecutionBlockIdFromExecution(focused: IRowNode): string {
  const execution: ExecutionModel = focused.data as ExecutionModel;
  const executionId = execution.executionId;
  const blockId = execution.blockId ?? 'N/A';
  return `ExecutionId=${executionId}, BlockId=${blockId}\n`;
}
