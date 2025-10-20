# Implementation Guide: Emitter-Based Row Updates

## 🎯 Core Architecture Pattern

The key pattern is **Component → Service → Observable → Grid Refresh** with strong typing and event-driven updates.

## 🔧 Essential Implementation Steps

### 1. **Define Strong Types**

```typescript
// interfaces/trade.interface.ts
export interface TradeData {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  status: 'ACTIVE' | 'CANCELLED' | 'FILLED';
  timestamp: Date;
  trader: string;
  cancelledBy?: string;
}

export interface CancellationRequest {
  type: 'single' | 'multiple';
  tradeIds: string[];
  trades: TradeData[];
}
```

### 2. **Service with BehaviorSubject Pattern**

```typescript
// services/trade-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TradeDataService {
  private tradesSubject = new BehaviorSubject<TradeData[]>([]);
  public trades$ = this.tradesSubject.asObservable();

  // 🎯 KEY: All data changes go through this subject
  private updateTrades(newTrades: TradeData[]): void {
    this.tradesSubject.next(newTrades);
  }

  // Cancel single trade
  cancelTrade(tradeId: string, cancelledBy = 'current-user'): void {
    const currentTrades = this.tradesSubject.value;
    const updatedTrades = currentTrades.map(trade =>
      trade.id === tradeId && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const, cancelledBy }
        : trade
    );
    this.updateTrades(updatedTrades); // 🔄 Triggers observable
  }

  // Cancel multiple trades
  cancelMultipleTrades(tradeIds: string[], cancelledBy = 'current-user'): void {
    const currentTrades = this.tradesSubject.value;
    const tradeIdSet = new Set(tradeIds);
    const updatedTrades = currentTrades.map(trade =>
      tradeIdSet.has(trade.id) && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const, cancelledBy }
        : trade
    );
    this.updateTrades(updatedTrades); // 🔄 Triggers observable
  }

  // Get current data
  getTrades(): Observable<TradeData[]> {
    return this.trades$;
  }
}
```

### 3. **Grid Component with Outputs**

```typescript
// components/data-grid.component.ts
import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';

@Component({
  selector: 'app-data-grid',
  template: `
    <div class="grid-toolbar">
      <app-cancellation-component
        #cancellationComponent
        [selectedItems]="getSelectedItems()"
        [currentUser]="currentUser"
        (cancellationConfirmed)="onCancellationConfirmed($event)"
      ></app-cancellation-component>
    </div>
    
    <ag-grid-angular
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      [gridOptions]="gridOptions"
      (gridReady)="onGridReady($event)"
      (selectionChanged)="onSelectionChanged()"
    ></ag-grid-angular>
  `
})
export class DataGridComponent {
  @Input() rowData: TradeData[] = [];
  @Input() currentUser = 'default-user';
  
  // 🎯 KEY: Strongly typed emitters
  @Output() itemCancelled = new EventEmitter<string>();
  @Output() multipleItemsCancelled = new EventEmitter<string[]>();
  @Output() cancellationConfirmed = new EventEmitter<CancellationRequest>();

  @ViewChild('cancellationComponent') cancellationComponent?: CancellationComponent;
  
  private gridApi?: GridApi;
  selectedCount = 0;

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // 🎯 KEY: Context menu integration
    (params.api as any).setGridOption('getContextMenuItems', () => {
      return this.getContextMenuItems();
    });
  }

  onSelectionChanged(): void {
    this.updateSelectedCount();
  }

  private updateSelectedCount(): void {
    const selectedNodes = this.gridApi?.getSelectedNodes() || [];
    this.selectedCount = selectedNodes.filter(
      node => node.data?.status === 'ACTIVE'
    ).length;
  }

  getSelectedItems(): TradeData[] {
    const selectedNodes = this.gridApi?.getSelectedNodes() || [];
    return selectedNodes
      .filter(node => node.data?.status === 'ACTIVE')
      .map(node => node.data);
  }

  // 🎯 KEY: Main emitter method
  onCancellationConfirmed(request: CancellationRequest): void {
    this.cancellationConfirmed.emit(request);
    
    // Backward compatibility emitters
    if (request.type === 'single') {
      this.itemCancelled.emit(request.tradeIds[0]);
    } else {
      this.multipleItemsCancelled.emit(request.tradeIds);
    }
  }

  // 🎯 KEY: Context menu triggers same component
  getContextMenuItems() {
    const selectedCount = this.selectedCount;
    return [
      {
        name: `Cancel Selected (${selectedCount})`,
        disabled: selectedCount === 0,
        action: () => {
          this.cancellationComponent?.triggerCancellation();
        }
      },
      'separator',
      'copy', 'export'
    ];
  }
}
```

### 4. **Cancellation Component (Reusable)**

```typescript
// components/cancellation.component.ts
@Component({
  selector: 'app-cancellation-component',
  template: `
    <button
      mat-raised-button
      color="warn"
      [disabled]="!canCancel"
      (click)="requestCancellation()"
    >
      <mat-icon>cancel</mat-icon>
      {{ buttonText }}
      <span *ngIf="itemCount > 0">({{ itemCount }})</span>
    </button>
  `
})
export class CancellationComponent {
  @Input() selectedItems: any[] = [];
  @Input() currentUser = 'default-user';
  @Input() requireConfirmation = true;
  
  @Output() cancellationConfirmed = new EventEmitter<CancellationRequest>();
  @Output() cancellationCancelled = new EventEmitter<void>();

  private dialog = inject(MatDialog);

  get canCancel(): boolean {
    return this.selectedItems.length > 0 && 
           this.selectedItems.every(item => item.status === 'ACTIVE');
  }

  get itemCount(): number {
    return this.selectedItems.length;
  }

  get buttonText(): string {
    return this.itemCount === 1 ? 'Cancel Item' : 'Cancel Selected';
  }

  // 🎯 KEY: Public method for programmatic triggering
  triggerCancellation(): void {
    this.requestCancellation();
  }

  private requestCancellation(): void {
    if (!this.canCancel) return;

    const request: CancellationRequest = {
      type: this.itemCount === 1 ? 'single' : 'multiple',
      tradeIds: this.selectedItems.map(item => item.id),
      trades: this.selectedItems
    };

    if (this.requireConfirmation) {
      this.showConfirmationDialog(request);
    } else {
      this.cancellationConfirmed.emit(request);
    }
  }

  private showConfirmationDialog(request: CancellationRequest): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { request, currentUser: this.currentUser }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.cancellationConfirmed.emit(request); // 🔄 Emit event
      } else {
        this.cancellationCancelled.emit();
      }
    });
  }
}
```

### 5. **Parent Component (Shell/Container)**

```typescript
// components/shell.component.ts
@Component({
  template: `
    <app-data-grid
      [rowData]="tradeData"
      [currentUser]="currentUser"
      (cancellationConfirmed)="onCancellationConfirmed($event)"
      (itemCancelled)="onItemCancelled($event)"
      (multipleItemsCancelled)="onMultipleItemsCancelled($event)"
    ></app-data-grid>
  `
})
export class ShellComponent implements OnInit {
  tradeData: TradeData[] = [];
  currentUser = 'john-doe';

  constructor(private tradeService: TradeDataService) {}

  ngOnInit(): void {
    // 🎯 KEY: Subscribe to service observable
    this.tradeService.getTrades().subscribe(trades => {
      this.tradeData = trades; // Grid auto-updates via [rowData] binding
    });
  }

  // 🎯 KEY: Handle confirmed cancellations
  onCancellationConfirmed(request: CancellationRequest): void {
    console.log('Cancelling:', request.tradeIds.length, 'items');
    this.tradeService.cancelMultipleTrades(request.tradeIds, this.currentUser);
    // Service update → Observable → Grid refresh (automatic)
  }

  // Legacy handlers (optional)
  onItemCancelled(itemId: string): void {
    this.tradeService.cancelTrade(itemId, this.currentUser);
  }

  onMultipleItemsCancelled(itemIds: string[]): void {
    this.tradeService.cancelMultipleTrades(itemIds, this.currentUser);
  }
}
```

## 🔄 Data Flow Summary

```
1. User Action (checkbox/context menu) 
   ↓
2. Grid Component emits event
   ↓  
3. Shell Component receives event
   ↓
4. Shell calls Service method
   ↓
5. Service updates BehaviorSubject
   ↓
6. Observable emits new data
   ↓
7. Grid [rowData] binding updates
   ↓
8. AG Grid refreshes automatically
   ↓
9. Selection state updates (cancelled items become unselectable)
```

## 🎯 Key Implementation Rules

### ✅ **Do This:**
- **Single Source of Truth**: All data changes through service
- **Reactive Updates**: Use BehaviorSubject + Observable pattern
- **Strong Typing**: Define interfaces for all data structures
- **Event-Driven**: Components emit events, don't mutate data directly
- **Consistent UX**: Same confirmation flow for all cancellation methods

### ❌ **Avoid This:**
- Direct data mutation in components
- Multiple data sources/stores
- Synchronous operations for async-like actions
- Different UX patterns for similar actions
- Tight coupling between grid and business logic

## 🚀 Benefits

1. **Automatic Updates**: Grid refreshes when service data changes
2. **Type Safety**: Compile-time error checking
3. **Testability**: Easy to mock services and test components
4. **Reusability**: Cancellation component works with any data type
5. **Consistency**: Same UX across all interaction methods
6. **Maintainability**: Clear separation of concerns

This pattern scales well and can be adapted to any data grid scenario with different entities (orders, users, products, etc.)!