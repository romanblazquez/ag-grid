import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TradeData, PersonService } from '../config';
import { CancellationConfirmationDialogComponent } from './cancellation-confirmation-dialog.component';

export interface CancellationRequest {
  type: 'single' | 'multiple';
  tradeIds: string[];
  trades: TradeData[];
}

@Component({
  selector: 'lib-trade-cancellation',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="cancellation-container">
      <button
        mat-raised-button
        color="warn"
        class="cancel-btn"
        [disabled]="!canCancel"
        (click)="requestCancellation()"
        [matTooltip]="buttonTooltip"
        matTooltipPosition="above"
      >
        <mat-icon>{{ buttonIcon }}</mat-icon>
        {{ buttonText }}
        <span 
          *ngIf="tradeCount > 0" 
          class="trade-count"
          [attr.aria-label]="tradeCount + ' trades selected'"
        >
          ({{ tradeCount }})
        </span>
      </button>
    </div>
  `,
  styles: [`
    .cancellation-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cancel-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 36px;
    }

    .trade-count {
      font-weight: bold;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 0.875rem;
    }

    .cancel-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class TradeCancellationComponent implements OnInit {
  @Input() selectedTrades: TradeData[] = [];
  @Input() personService?: PersonService;
  @Input() currentUser?: string = 'user1'; // Who is performing the cancellation
  @Input() requireConfirmation = true; // Whether to show confirmation dialog
  
  // Output events
  @Output() cancellationConfirmed = new EventEmitter<CancellationRequest>();
  @Output() cancellationCancelled = new EventEmitter<void>();

  private dialog = inject(MatDialog);

  ngOnInit(): void {
    console.log('Trade Cancellation Component initialized');
  }

  get canCancel(): boolean {
    return this.selectedTrades.length > 0 && 
           this.selectedTrades.every(trade => trade.status === 'ACTIVE');
  }

  get tradeCount(): number {
    return this.selectedTrades.length;
  }

  get buttonText(): string {
    if (this.tradeCount === 0) {
      return 'Cancel Selected';
    }
    return this.tradeCount === 1 ? 'Cancel Trade' : 'Cancel Selected';
  }

  get buttonIcon(): string {
    return this.tradeCount <= 1 ? 'cancel' : 'cancel_presentation';
  }

  get buttonTooltip(): string {
    if (this.tradeCount === 0) {
      return 'Select active trades to cancel';
    }
    return `Cancel ${this.tradeCount} selected trade${this.tradeCount > 1 ? 's' : ''}`;
  }

  requestCancellation(): void {
    if (!this.canCancel) {
      return;
    }

    const cancellationRequest: CancellationRequest = {
      type: this.tradeCount === 1 ? 'single' : 'multiple',
      tradeIds: this.selectedTrades.map(t => t.id),
      trades: this.selectedTrades
    };

    if (this.requireConfirmation) {
      this.openConfirmationDialog(cancellationRequest);
    } else {
      // Skip confirmation and emit directly
      this.cancellationConfirmed.emit(cancellationRequest);
    }
  }

  private openConfirmationDialog(request: CancellationRequest): void {
    const dialogRef = this.dialog.open(CancellationConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        request,
        personService: this.personService,
        currentUser: this.currentUser
      },
      disableClose: false,
      autoFocus: true,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result === true) {
        // User confirmed cancellation
        this.cancellationConfirmed.emit(request);
      } else {
        // User cancelled or closed dialog
        this.cancellationCancelled.emit();
      }
    });
  }
}