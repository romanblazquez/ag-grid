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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';

// Import Enterprise modules
import { AllEnterpriseModule } from 'ag-grid-enterprise';

import { CancelledByCellComponent } from '../cancelled-by-cell/cancelled-by-cell.component';
import { ThemeService, DEFAULT_THEME, setupAgGridLicense } from '@trade-platform/shared/ui-components';

// Register AG Grid modules including Enterprise
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

export interface TradeData {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  trader: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledBy?: string; // Person ID who cancelled the trade
}

export interface Person {
  id: string;
  fullName: string;
  initials: string;
}

export interface PersonService {
  getPersonById(id: string): Person | undefined;
  getAllPersons(): Person[];
}

@Component({
  selector: 'lib-trade-grid',
  imports: [CommonModule, AgGridAngular, CancelledByCellComponent, MatButtonModule, MatIconModule, MatTooltipModule, MatBadgeModule, MatMenuModule, MatDividerModule],
  templateUrl: './trade-grid.html',
  styleUrl: './trade-grid.css',
})
export class TradeGrid implements OnInit, OnChanges {
  @Input() rowData: TradeData[] = [];
  @Input() personService?: PersonService;
  @Input() themeName?: string = 'dark'; // Allow theme selection via input
  @Output() cancelTrade = new EventEmitter<string>();
  @Output() cancelSelectedTrades = new EventEmitter<string[]>();

  // Use the custom dark theme from shared components
  theme = DEFAULT_THEME;
  selectedActiveCount = 0;
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  private gridApi: GridApi | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  // Default person service with mock data
  private defaultPersonService: PersonService = {
    getPersonById: (id: string) => {
      const persons = this.defaultPersonService.getAllPersons();
      return persons.find(p => p.id === id);
    },
    getAllPersons: () => [
      { id: 'user1', fullName: 'John Smith', initials: 'JS' },
      { id: 'user2', fullName: 'Jane Doe', initials: 'JD' },
      { id: 'user3', fullName: 'Michael Johnson', initials: 'MJ' },
      { id: 'user4', fullName: 'Sarah Wilson', initials: 'SW' },
      { id: 'user5', fullName: 'David Brown', initials: 'DB' },
    ]
  };

    // Grid configuration with enterprise features
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filter: true,
    enableRowGroup: false,
    enablePivot: false,
    enableValue: false,
  };

  gridOptions: GridOptions = {
    rowGroupPanelShow: 'always',
    rowSelection: {
      mode: 'multiRow',
      enableClickSelection: true,
      groupSelects: 'descendants'
    },
    cellSelection: true,
    suppressAggFuncInHeader: false,
    groupDefaultExpanded: 1,
    animateRows: true,
    sideBar: {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
        },
        {
          id: 'filters',
          labelDefault: 'Filters',
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
        }
      ]
    }
  };

  columnDefs: ColDef[] = [
    { 
      field: 'timestamp', 
      headerName: 'Time',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleTimeString();
      }
    },
    { 
      field: 'symbol', 
      headerName: 'Symbol',
      width: 100,
      sortable: true,
      filter: 'agTextColumnFilter',
      enableRowGroup: true,
      rowGroup: false
    },
    { 
      field: 'side', 
      headerName: 'Side',
      width: 80,
      sortable: true,
      filter: 'agSetColumnFilter',
      enableRowGroup: true,
      rowGroup: false,
      cellStyle: (params) => {
        const style: Record<string, string> = params.value === 'BUY' 
          ? { color: '#4caf50', fontWeight: 'bold' }
          : { color: '#f44336', fontWeight: 'bold' };
        return style;
      }
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      enableValue: true,
      aggFunc: 'sum',
      valueFormatter: (params) => {
        const value = params.value;
        if (typeof value === 'number' && !isNaN(value)) {
          return value.toLocaleString();
        }
        return '0';
      }
    },
    { 
      field: 'price', 
      headerName: 'Price',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      enableValue: true,
      aggFunc: 'avg',
      valueFormatter: (params) => {
        const value = params.value;
        if (typeof value === 'number' && !isNaN(value)) {
          return `$${value.toFixed(2)}`;
        }
        return '$0.00';
      }
    },
    { 
      field: 'trader', 
      headerName: 'Trader',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      enableRowGroup: true,
      rowGroup: false
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 100,
      sortable: true,
      filter: 'agSetColumnFilter',
      enableRowGroup: true,
      rowGroup: false,
      cellStyle: (params) => {
        const status = params.value?.toLowerCase();
        const style: Record<string, string> = { fontWeight: 'bold' };
        switch (status) {
          case 'filled':
            style['color'] = '#4caf50';
            break;
          case 'cancelled':
            style['color'] = '#f44336';
            break;
          case 'pending':
            style['color'] = '#ff9800';
            break;
          default:
            style['color'] = '#9e9e9e';
            break;
        }
        return style;
      }
    },
    {
      field: 'cancelledBy',
      headerName: 'Cancelled By',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: CancelledByCellComponent,
      enableRowGroup: true,
      rowGroup: false,
      valueGetter: (params) => {
        const trade = params.data;
        if (!trade || trade.status !== 'CANCELLED' || !trade.cancelledBy) {
          return null;
        }
        
        const personService = this.getPersonService();
        const person = personService.getPersonById(trade.cancelledBy);
        
        return person ? person.fullName : `Unknown (${trade.cancelledBy})`;
      },
      cellRendererParams: {
        getPersonService: () => this.getPersonService()
      }
    }
  ];

  rowSelectionOptions = {
    mode: 'multiRow' as const,
    checkboxes: true,
    isRowSelectable: (rowNode: { data?: TradeData }) => {
      return rowNode.data?.status === 'ACTIVE';
    },
  };

  ngOnInit(): void {
    // Component initialized
    console.log('TradeGrid initialized');
    this.updateTheme();
    this.initializeColumnDefs();
    this.setupEnterpriseLicense();
  }

  private async setupEnterpriseLicense(): Promise<void> {
    try {
      await setupAgGridLicense({
        silent: false,
        forceInDevelopment: true
      });
    } catch (error) {
      console.warn('AG Grid license setup failed:', error);
    }
  }

  private initializeColumnDefs(): void {
    // Update the cancelled by column with proper service binding
    const cancelledByColIndex = this.columnDefs.findIndex(col => col.field === 'cancelledBy');
    if (cancelledByColIndex >= 0) {
      this.columnDefs[cancelledByColIndex] = {
        ...this.columnDefs[cancelledByColIndex],
        cellRendererParams: {
          getPersonService: () => this.getPersonService()
        }
      };
    }
  }

  ngOnChanges(): void {
    // Handle data changes if needed in the future
    console.log('TradeGrid data changed');
    this.updateTheme();
    this.cdr.detectChanges();
  }

  private updateTheme(): void {
    if (this.themeName) {
      const themeConfig = ThemeService.getThemeByName(this.themeName);
      if (themeConfig) {
        this.theme = themeConfig.theme;
      }
    }
  }

  private getPersonService(): PersonService {
    return this.personService || this.defaultPersonService;
  }

  getCancelledByDisplay(cancelledBy: string | undefined): { initials: string; fullName: string } | null {
    if (!cancelledBy) return null;
    
    const service = this.getPersonService();
    const person = service.getPersonById(cancelledBy);
    
    if (!person) {
      return { initials: cancelledBy, fullName: `Unknown (${cancelledBy})` };
    }
    
    return { initials: person.initials, fullName: person.fullName };
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
      (node: { data?: TradeData }) => node.data?.status === 'ACTIVE'
    );

    if (selectedActiveTrades.length > 0) {
      const tradeIds = selectedActiveTrades.map((node: { data: TradeData }) => node.data.id);
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
      (node: { data?: TradeData }) => node.data?.status === 'ACTIVE'
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

  // Helper method to generate sample data for testing
  generateSampleData(): TradeData[] {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    const traders = ['trader1', 'trader2', 'trader3', 'trader4'];
    const sides: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];
    const statuses: ('ACTIVE' | 'CANCELLED')[] = ['ACTIVE', 'CANCELLED'];
    const cancelledByUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];

    const sampleData: TradeData[] = [];

    for (let i = 1; i <= 20; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const trade: TradeData = {
        id: `trade-${i}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        price: Math.random() * 1000 + 50,
        quantity: Math.floor(Math.random() * 1000) + 1,
        side: sides[Math.floor(Math.random() * sides.length)],
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 30), // Random time in last 30 days
        trader: traders[Math.floor(Math.random() * traders.length)],
        status: status,
        cancelledBy: status === 'CANCELLED' ? 
          cancelledByUsers[Math.floor(Math.random() * cancelledByUsers.length)] : 
          undefined
      };
      sampleData.push(trade);
    }

    return sampleData;
  }
}
