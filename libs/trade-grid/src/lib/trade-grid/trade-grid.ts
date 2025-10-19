import {
  Component,
  Input,
  OnInit,
  OnChanges,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
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
  imports: [CommonModule, AgGridAngular],
  templateUrl: './trade-grid.html',
  styleUrl: './trade-grid.css',
})
export class TradeGrid implements OnInit, OnChanges {
  @Input() rowData: TradeData[] = [];
  @Output() cancelTrade = new EventEmitter<string>();
  @Output() cancelSelectedTrades = new EventEmitter<string[]>();

  // Use the new Theming API (v33+)
  theme = themeQuartz;
  selectedActiveCount = 0;
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  private gridApi: GridApi | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  columnDefs: ColDef<TradeData>[] = [
    {
      field: 'symbol',
      headerName: 'Symbol',
      sortable: true,
      filter: true,
      width: 100,
    },
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
    {
      field: 'side',
      headerName: 'Side',
      sortable: true,
      filter: true,
      width: 100,
    },
    {
      field: 'timestamp',
      headerName: 'Time',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
      width: 200,
    },
    {
      field: 'trader',
      headerName: 'Trader',
      sortable: true,
      filter: true,
      width: 150,
    },
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
    console.log('TradeGrid initialized');
  }

  ngOnChanges(): void {
    // Handle data changes if needed in the future
    console.log('TradeGrid data changed');
    this.cdr.detectChanges();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Auto-size columns to fit container
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }

  onSelectionChanged(): void {
    this.updateSelectedCount();
  }

  onCancelSelected(): void {
    const selectedNodes = this.gridApi?.getSelectedNodes() || [];
    const selectedActiveTrades = selectedNodes.filter(
      (node: any) => node.data?.status === 'ACTIVE'
    );

    if (selectedActiveTrades.length > 0) {
      const tradeIds = selectedActiveTrades.map((node: any) => node.data.id);
      this.cancelSelectedTrades.emit(tradeIds);
    }
  }

  private updateSelectedCount(): void {
    if (!this.gridApi) {
      this.selectedActiveCount = 0;
      return;
    }
    const selectedNodes = this.gridApi.getSelectedNodes() || [];
    this.selectedActiveCount = selectedNodes.filter(
      (node: any) => node.data?.status === 'ACTIVE'
    ).length;
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.showContextMenu = true;
  }

  hideContextMenu(): void {
    this.showContextMenu = false;
  }

  onContextMenuCancelSelected(): void {
    this.onCancelSelected();
    this.hideContextMenu();
  }
}
