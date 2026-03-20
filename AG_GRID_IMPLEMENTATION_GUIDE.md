# AG Grid Implementation Guide: Emitter-Based Updates

## 🎯 AG Grid Configuration for Reactive Updates

The key to making emitters work with AG Grid is proper **row model configuration** and **selection handling**.

## 🔧 Essential AG Grid Setup

### 1. **Grid Options Configuration**

```typescript
// Essential gridOptions for reactive updates
gridOptions: GridOptions = {
  // 🎯 KEY: Use client-side row model for automatic updates
  rowModelType: 'clientSide',

  // Row selection configuration
  rowSelection: {
    mode: 'multiRow',
    enableClickSelection: true,
    headerCheckbox: true,
    groupSelects: 'descendants',
    // 🎯 KEY: Only allow selection of actionable items
    isRowSelectable: (rowNode: { data?: TradeData }) => {
      return rowNode.data?.status === 'ACTIVE';
    },
  },

  // 🎯 KEY: Enable animations for smooth updates
  animateRows: true,
  
  // Context menu configuration
  getContextMenuItems: () => this.getContextMenuItems(),
  
  // Other useful options
  enableRangeSelection: true,
  suppressRowClickSelection: false,
  suppressCellSelection: false,
};
```

### 2. **Grid Component Integration**

```typescript
// grid.component.ts
@Component({
  template: `
    <div class="grid-container">
      <!-- Toolbar with action components -->
      <div class="grid-toolbar">
        <app-action-component
          #actionComponent
          [selectedItems]="getSelectedItems()"
          [currentUser]="currentUser"
          (actionConfirmed)="onActionConfirmed($event)"
        ></app-action-component>
      </div>

      <!-- AG Grid with proper bindings -->
      <ag-grid-angular
        class="ag-theme-alpine"
        [rowData]="rowData"                    <!-- 🎯 KEY: Reactive binding -->
        [columnDefs]="columnDefs"
        [defaultColDef]="defaultColDef"
        [gridOptions]="gridOptions"
        [modules]="modules"
        [animateRows]="true"                   <!-- 🎯 KEY: Smooth updates -->
        (gridReady)="onGridReady($event)"
        (selectionChanged)="onSelectionChanged()"
        (rowDataChanged)="onRowDataChanged()"  <!-- 🎯 KEY: Track data changes -->
      ></ag-grid-angular>
    </div>
  `
})
export class DataGridComponent {
  @Input() rowData: TradeData[] = [];  // 🎯 KEY: This updates automatically from parent
  @Output() actionConfirmed = new EventEmitter<ActionRequest>();

  private gridApi?: GridApi;
  selectedCount = 0;

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // 🎯 KEY: Auto-size columns after data loads
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }

  // 🎯 KEY: Track selection changes
  onSelectionChanged(): void {
    this.updateSelectedCount();
  }

  // 🎯 KEY: Handle data changes (optional logging/cleanup)
  onRowDataChanged(): void {
    console.log('Grid data updated:', this.rowData.length, 'items');
    // Clear selection if needed after updates
    this.clearInvalidSelections();
  }

  private updateSelectedCount(): void {
    const selectedNodes = this.gridApi?.getSelectedNodes() || [];
    this.selectedCount = selectedNodes.filter(
      node => node.data?.status === 'ACTIVE'
    ).length;
  }

  // 🎯 KEY: Get currently selected items for action component
  getSelectedItems(): TradeData[] {
    if (!this.gridApi) return [];
    
    const selectedNodes = this.gridApi.getSelectedNodes() || [];
    return selectedNodes
      .filter(node => node.data?.status === 'ACTIVE')
      .map(node => node.data);
  }

  // 🎯 KEY: Clear selections for items that are no longer selectable
  private clearInvalidSelections(): void {
    if (!this.gridApi) return;
    
    const selectedNodes = this.gridApi.getSelectedNodes() || [];
    const invalidNodes = selectedNodes.filter(
      node => node.data?.status !== 'ACTIVE'
    );
    
    if (invalidNodes.length > 0) {
      invalidNodes.forEach(node => node.setSelected(false));
    }
  }

  // 🎯 KEY: Context menu integration
  getContextMenuItems() {
    const selectedCount = this.selectedCount;
    return [
      {
        name: `Process Selected (${selectedCount})`,
        disabled: selectedCount === 0,
        action: () => {
          this.actionComponent?.triggerAction(); // Same component as toolbar
        }
      },
      'separator',
      'copy',
      'copyWithHeaders', 
      'export'
    ];
  }

  // 🎯 KEY: Emit to parent component
  onActionConfirmed(request: ActionRequest): void {
    this.actionConfirmed.emit(request);
  }
}
```

### 3. **Column Definitions with Status-Aware Styling**

```typescript
// column-config.ts
export class GridColumnConfig {
  static createColumnDefinitions(): ColDef[] {
    return [
      {
        field: 'id',
        headerName: 'ID',
        width: 100,
        pinned: 'left'
      },
      {
        field: 'symbol',
        headerName: 'Symbol', 
        width: 100,
        filter: 'agSetColumnFilter',
        enableRowGroup: true
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        filter: 'agSetColumnFilter',
        // 🎯 KEY: Status-aware cell styling
        cellStyle: (params) => {
          const status = params.value;
          switch (status) {
            case 'ACTIVE':
              return { color: '#16a34a', fontWeight: 'bold' };
            case 'CANCELLED':
              return { color: '#dc2626', fontWeight: 'bold' };
            case 'FILLED':
              return { color: '#2563eb', fontWeight: 'bold' };
            default:
              return { color: '#6b7280' };
          }
        }
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => `$${params.value?.toFixed(2) || '0.00'}`
      },
      {
        field: 'quantity', 
        headerName: 'Quantity',
        width: 120,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => params.value?.toLocaleString() || '0'
      },
      // 🎯 KEY: Action buttons in grid (optional)
      {
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        pinned: 'right',
        cellRenderer: 'actionCellRenderer',
        cellRendererParams: {
          onAction: (data: any, action: string) => {
            // Handle individual row actions
          }
        }
      }
    ];
  }

  static createDefaultColDef(): ColDef {
    return {
      flex: 1,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true,
    };
  }
}
```

### 4. **Parent Component Data Binding**

```typescript
// parent.component.ts
@Component({
  template: `
    <app-data-grid
      [rowData]="gridData"                    <!-- 🎯 KEY: Reactive data binding -->
      [currentUser]="currentUser"
      (actionConfirmed)="onActionConfirmed($event)"
    ></app-data-grid>
  `
})
export class ParentComponent implements OnInit, OnDestroy {
  gridData: TradeData[] = [];
  currentUser = 'john-doe';
  
  private destroy$ = new Subject<void>();

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // 🎯 KEY: Subscribe to service observable
    this.dataService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.gridData = data; // 🔄 This automatically triggers grid update
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🎯 KEY: Handle confirmed actions
  onActionConfirmed(request: ActionRequest): void {
    console.log('Processing action:', request);
    
    // Update through service - grid will update automatically
    this.dataService.processItems(request.itemIds, this.currentUser);
  }
}
```

### 5. **AG Grid Module Registration**

```typescript
// app.module.ts or main.ts (standalone)
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise'; // If using Enterprise

// Register modules
ModuleRegistry.registerModules([
  AllCommunityModule,
  AllEnterpriseModule // Optional: for advanced features
]);
```

### 6. **Grid Styling and Theme**

```scss
/* grid.component.scss */
.grid-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.grid-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

/* 🎯 KEY: Proper grid sizing */
.ag-theme-alpine {
  height: calc(100% - 80px); /* Account for toolbar */
  width: 100%;
}

/* Custom row styling based on status */
.ag-theme-alpine .ag-row[row-data-status="CANCELLED"] {
  opacity: 0.6;
  background-color: #fee2e2;
}

.ag-theme-alpine .ag-row[row-data-status="ACTIVE"] {
  background-color: #f0fdf4;
}

/* Selection highlighting */
.ag-theme-alpine .ag-row-selected {
  background-color: #dbeafe !important;
}
```

## 🔄 **Complete Update Flow in AG Grid**

```
1. User Action (select + click button/context menu)
   ↓
2. Grid Component: getSelectedItems() → returns selected TradeData[]
   ↓  
3. Action Component: receives selected items via @Input
   ↓
4. Action Component: emits actionConfirmed with ActionRequest
   ↓
5. Parent Component: receives event, calls dataService.processItems()
   ↓
6. Data Service: updates BehaviorSubject with new data
   ↓
7. Parent Component: gridData updates via subscription
   ↓
8. AG Grid: [rowData] binding triggers automatic refresh
   ↓
9. Grid Updates:
   - Rows re-render with new status
   - Invalid selections cleared (cancelled items)
   - Animations show changes
   - Selection count updates
```

## 🎯 **Key AG Grid Features for Reactive Updates**

### ✅ **Essential Configurations:**
- `rowModelType: 'clientSide'` - Enables automatic updates
- `animateRows: true` - Smooth visual feedback
- `isRowSelectable()` - Dynamic selection rules
- `[rowData]` binding - Reactive data updates

### ✅ **Selection Management:**
- Clear invalid selections after updates
- Update selection count on changes
- Consistent selection state across interactions

### ✅ **Performance Optimizations:**
- Use `trackByFn` for large datasets
- Debounce rapid updates if needed
- Efficient column definitions

This setup ensures that **any service data change automatically refreshes the grid** while maintaining proper selection state and user experience! 🚀