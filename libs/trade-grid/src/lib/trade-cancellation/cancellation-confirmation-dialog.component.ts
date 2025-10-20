import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { PersonService } from '../config';
import { CancellationRequest } from './trade-cancellation.component';

interface DialogData {
  request: CancellationRequest;
  personService?: PersonService;
  currentUser?: string;
}

@Component({
  selector: 'lib-cancellation-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
  ],
  template: `
    <div class="dialog-container">
      <div mat-dialog-title class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2>Confirm Trade Cancellation</h2>
      </div>

      <div mat-dialog-content class="dialog-content">
        <p class="confirmation-message">
          Are you sure you want to cancel 
          <strong>{{ data.request.tradeIds.length }}</strong> 
          trade{{ data.request.tradeIds.length > 1 ? 's' : '' }}?
        </p>

        <div class="trade-summary" *ngIf="data.request.trades.length <= 5">
          <h4>Trades to be cancelled:</h4>
          <mat-list class="trade-list">
            <mat-list-item *ngFor="let trade of data.request.trades">
              <mat-icon matListItemIcon [class]="getSideIconClass(trade.side)">
                {{ getSideIcon(trade.side) }}
              </mat-icon>
              <div matListItemTitle>{{ trade.symbol }}</div>
              <div matListItemLine>
                {{ trade.quantity | number }} @ {{ '$' + trade.price.toFixed(2) }}
                • {{ trade.trader }}
              </div>
            </mat-list-item>
          </mat-list>
        </div>

        <div class="bulk-summary" *ngIf="data.request.trades.length > 5">
          <h4>Bulk Cancellation Summary:</h4>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="label">Total Trades:</span>
              <span class="value">{{ data.request.trades.length }}</span>
            </div>
            <div class="stat-item">
              <span class="label">Buy Orders:</span>
              <span class="value buy">{{ getBuyCount() }}</span>
            </div>
            <div class="stat-item">
              <span class="label">Sell Orders:</span>
              <span class="value sell">{{ getSellCount() }}</span>
            </div>
            <div class="stat-item">
              <span class="label">Total Value:</span>
              <span class="value">{{ '$' + getTotalValue().toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <div class="cancellation-info">
          <p class="info-text">
            <mat-icon class="info-icon">info</mat-icon>
            This action cannot be undone. The trades will be marked as 
            <strong>CANCELLED</strong> and attributed to {{ getCurrentUserDisplay() }}.
          </p>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          (click)="onCancel()" 
          class="cancel-btn"
        >
          <mat-icon>close</mat-icon>
          Keep Trades
        </button>
        <button 
          mat-raised-button 
          color="warn" 
          (click)="onConfirm()"
          class="confirm-btn"
        >
          <mat-icon>cancel</mat-icon>
          Cancel {{ data.request.tradeIds.length }} Trade{{ data.request.tradeIds.length > 1 ? 's' : '' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 400px;
      max-width: 600px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .warning-icon {
      color: #f59e0b;
      font-size: 24px;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .dialog-content {
      padding: 0 24px;
    }

    .confirmation-message {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
      color: #374151;
    }

    .trade-summary h4,
    .bulk-summary h4 {
      margin: 1rem 0 0.5rem 0;
      color: #1f2937;
    }

    .trade-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-item .label {
      font-weight: 500;
      color: #6b7280;
    }

    .stat-item .value {
      font-weight: 600;
      color: #1f2937;
    }

    .stat-item .value.buy {
      color: #16a34a;
    }

    .stat-item .value.sell {
      color: #dc2626;
    }

    .buy-icon {
      color: #16a34a;
    }

    .sell-icon {
      color: #dc2626;
    }

    .cancellation-info {
      margin-top: 1.5rem;
    }

    .info-text {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 1rem;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      margin: 0;
      font-size: 0.875rem;
      color: #92400e;
    }

    .info-icon {
      color: #f59e0b;
      font-size: 18px;
      margin-top: 1px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 24px;
      margin-top: 1rem;
    }

    .cancel-btn,
    .confirm-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `]
})
export class CancellationConfirmationDialogComponent {
  public dialogRef = inject(MatDialogRef<CancellationConfirmationDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  getSideIcon(side: string): string {
    return side === 'BUY' ? 'trending_up' : 'trending_down';
  }

  getSideIconClass(side: string): string {
    return side === 'BUY' ? 'buy-icon' : 'sell-icon';
  }

  getBuyCount(): number {
    return this.data.request.trades.filter(t => t.side === 'BUY').length;
  }

  getSellCount(): number {
    return this.data.request.trades.filter(t => t.side === 'SELL').length;
  }

  getTotalValue(): number {
    return this.data.request.trades.reduce((sum, trade) => {
      return sum + (trade.price * trade.quantity);
    }, 0);
  }

  getCurrentUserDisplay(): string {
    if (!this.data.currentUser || !this.data.personService) {
      return this.data.currentUser || 'Current User';
    }

    const person = this.data.personService.getPersonById(this.data.currentUser);
    return person ? person.fullName : this.data.currentUser;
  }
}