import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
  OnDestroy,
  ChangeDetectorRef,
  InjectionToken,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule, LowerCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {
  TradeModel,
  ExecutionModel,
  CancellationReason,
  getCancellationReasons,
} from '@trade-platform/exac/shared/data';
import { MultiCancelDialogData } from './models/multi-cancel-dialog-data.interface';
import { CancelResult } from './models/cancel-result.interface';

export interface XaEntityRequest {
  requestId: string;
  reasonCode: string;
  reasonText?: string;
  entity: {
    entityId: string;
    recordVersionNumber: number;
  };
}

@Component({
  selector: 'tp-cancel-outright',
  templateUrl: './cancel-outright.component.html',
  styleUrls: ['./cancel-outright.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LowerCasePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatCardModule,
  ],
})
export class CancelOutrightComponent implements OnInit, OnDestroy {
  public cancelForm: FormGroup;
  public showPreview = false;
  public isProcessing = false;
  public cancelErrorMessages: string[] = [];

  private readonly destroy$ = new Subject<void>();

  public constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CancelOutrightComponent, CancelResult>,
    private readonly snackBar: MatSnackBar,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: MultiCancelDialogData,
  ) {
    this.cancelForm = this.createForm();
  }

  public ngOnInit(): void {
    this.setupFormValidation();
  }

  public static open(
    dialog: MatDialog,
    data: MultiCancelDialogData,
    config: Partial<MatDialogConfig<MultiCancelDialogData>> = {},
  ): MatDialogRef<CancelOutrightComponent, CancelResult> {
    const defaultConfig: MatDialogConfig<MultiCancelDialogData> = {
      data,
      panelClass: 'cancel-dialog-container',
      width: '500px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    };
    return dialog.open<CancelOutrightComponent, MultiCancelDialogData, CancelResult>(
      CancelOutrightComponent,
      { ...defaultConfig, ...config },
    );
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public get cancellationReasons(): CancellationReason[] {
    const isBatchOperation = this.getTotalItemsCount() > 1;
    return getCancellationReasons(isBatchOperation);
  }

  public getCancelTypeDisplayName(): string {
    switch (this.data.cancelType) {
      case 'trades':
        return 'Trade';
      case 'executions':
        return 'Execution';
      case 'mixed':
        return 'Items';
      default:
        return 'Items';
    }
  }

  public getTotalItemsCount(): number {
    return this.data.selectedTrades.length + this.data.selectedExecutions.length;
  }

  public togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  public canSubmit(): boolean {
    return this.cancelForm.valid && !this.isProcessing;
  }

  public trackTradeById(index: number, trade: TradeModel): string {
    return trade.entityId;
  }

  public trackExecutionById(index: number, execution: ExecutionModel): string {
    return execution.executionId;
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public async onConfirmCancel(): Promise<void> {
    if (!this.canSubmit()) return;

    this.isProcessing = true;
    this.cancelErrorMessages = [];

    try {
      const reason = this.getFinalReason();
      const cancelledItems: (TradeModel | ExecutionModel)[] = [];
      const failedItems: (TradeModel | ExecutionModel)[] = [];
      const allItems = [...this.data.selectedTrades, ...this.data.selectedExecutions];

      for (const item of allItems) {
        try {
          const cancelRequest = this.createCancelRequest(item, reason);
          const entityLevel = this.getEntityLevel(item);
          const url = this.getCancelUrl(entityLevel);
          const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
          await this.http.post(url, cancelRequest, { headers }).toPromise();
          cancelledItems.push(item);
        } catch (err: unknown) {
          failedItems.push(item);
          const msg = err instanceof Error ? err.message : 'Cancellation failed for unknown reason.';
          this.cancelErrorMessages.push(msg);
          this.cdr.markForCheck();
        }
      }

      if (failedItems.length === 0) {
        this.snackBar.open(`Successfully cancelled ${cancelledItems.length} item(s)`, 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar',
        });
        this.dialogRef.close({ success: true, cancelledItems, failedItems: [], reason });
      }
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      reason: ['', Validators.required],
      customReason: [''],
    });
  }

  private setupFormValidation(): void {
    const reasonControl = this.cancelForm.get('reason');
    const customReasonControl = this.cancelForm.get('customReason');

    reasonControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((reason) => {
      if (reason === 'OTR') {
        customReasonControl?.setValidators([Validators.required]);
      } else {
        customReasonControl?.clearValidators();
      }
      customReasonControl?.updateValueAndValidity();
    });
  }

  private getFinalReason(): string {
    const { reason } = this.cancelForm.value as { reason: string; customReason: string };
    return reason;
  }

  private createCancelRequest(item: TradeModel | ExecutionModel, reason: string): XaEntityRequest {
    const { customReason } = this.cancelForm.value as { reason: string; customReason: string };
    const request: XaEntityRequest = {
      requestId: this.generateRequestId(),
      reasonCode: reason,
      entity: {
        entityId: this.getEntityId(item),
        recordVersionNumber: this.getRecordVersion(item),
      },
    };
    if (reason === 'OTR' && customReason) {
      request.reasonText = customReason;
    }
    return request;
  }

  private getEntityLevel(item: TradeModel | ExecutionModel): string {
    return 'entityId' in item ? 'T' : 'E';
  }

  private getCancelUrl(entityLevel: string): string {
    if (!this.data.cancelServiceUrl) {
      throw new Error('Cancel service URL is not set.');
    }
    const type = entityLevel === 'T' ? 'trades' : 'executions';
    return this.data.cancelServiceUrl.replace('%TYPE%', type);
  }

  private generateRequestId(): string {
    return `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private getRecordVersion(item: TradeModel | ExecutionModel): number {
    if ('recordVersionNumber' in item && typeof item.recordVersionNumber === 'number') {
      return item.recordVersionNumber;
    }
    return 0;
  }

  private getEntityId(item: TradeModel | ExecutionModel): string {
    return 'entityId' in item ? item.entityId : (item as ExecutionModel).executionId;
  }
}
