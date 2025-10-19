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
import { 
  TradeGridColumnsConfig, 
  PersonService, 
  TradeData 
} from '../config';

// Register AG Grid modules including Enterprise
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

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

  // Column definitions from configuration
  columnDefs: ColDef[] = [];
  
  // Default column definition from configuration  
  defaultColDef: ColDef = TradeGridColumnsConfig.createDefaultColDef();

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

  ngOnChanges(): void {
    // Handle data changes if needed in the future
    console.log('TradeGrid data changed');
    this.updateTheme();
    this.cdr.detectChanges();
  }

  private initializeColumnDefs(): void {
    // Initialize column definitions using the configuration
    const personService = this.getPersonService();
    this.columnDefs = TradeGridColumnsConfig.createColumnDefinitions(personService);
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
    return this.personService || TradeGridColumnsConfig.createDefaultPersonService();
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
