import { Component, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  ICellRendererParams,
} from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export interface TradeData {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  trader: string;
  status: 'ACTIVE' | 'CANCELLED';
}

@Component({
  selector: 'lib-trade-grid',
  imports: [AgGridAngular],
  templateUrl: './trade-grid.html',
  styleUrl: './trade-grid.css',
})
export class TradeGrid implements OnInit, OnChanges {
  @Input() rowData: TradeData[] = [];
  @Output() cancelTrade = new EventEmitter<string>();
  @Output() cancelSelectedTrades = new EventEmitter<string[]>();

  // Use the new Theming API (v33+)
  theme = themeQuartz;

  private gridApi: any;

  columnDefs: ColDef<TradeData>[] = [
    { field: 'symbol', headerName: 'Symbol', sortable: true, filter: true, width: 100 },
    {
      field: 'price',
      headerName: 'Price',
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
      width: 120,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 120,
    },
    { field: 'side', headerName: 'Side', sortable: true, filter: true, width: 100 },
    {
      field: 'timestamp',
      headerName: 'Time',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
      width: 200,
    },
    { field: 'trader', headerName: 'Trader', sortable: true, filter: true, width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      filter: true,
      width: 120,
      cellStyle: (params) => {
        if (params.value === 'CANCELLED') {
          return { color: '#ef4444', fontWeight: '600' };
        }
        return { color: '#10b981', fontWeight: '600' };
      },
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params: ICellRendererParams<TradeData>) => {
        const trade = params.data;
        if (!trade || trade.status === 'CANCELLED') {
          return '<span style="color: #9ca3af;">N/A</span>';
        }
        return '<button class="cancel-btn">Cancel</button>';
      },
      onCellClicked: (params) => {
        const trade = params.data;
        if (trade && trade.status === 'ACTIVE') {
          this.cancelTrade.emit(trade.id);
        }
      },
    },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
  };

  rowSelectionOptions = {
    mode: 'multiRow' as const,
    checkboxes: true,
    isRowSelectable: (rowNode: any) => {
      return rowNode.data?.status === 'ACTIVE';
    },
  };

  ngOnInit(): void {
    // Component initialized
  }

  ngOnChanges(): void {
    // Handle data changes if needed in the future
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Auto-size columns to fit container
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }

  getContextMenuItems = (params: any) => {
    const selectedNodes = this.gridApi?.getSelectedNodes() || [];
    const selectedActiveTrades = selectedNodes.filter(
      (node: any) => node.data?.status === 'ACTIVE'
    );

    const result: any[] = [
      {
        name: `Cancel Selected Trades (${selectedActiveTrades.length})`,
        disabled: selectedActiveTrades.length === 0,
        action: () => {
          const tradeIds = selectedActiveTrades.map((node: any) => node.data.id);
          this.cancelSelectedTrades.emit(tradeIds);
        },
        icon: '<span style="color: #ef4444;">✖</span>',
      },
      'separator',
      'copy',
      'copyWithHeaders',
      'export',
    ];

    return result;
  };
}
