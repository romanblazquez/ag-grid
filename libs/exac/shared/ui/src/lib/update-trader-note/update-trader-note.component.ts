import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { ExecutionModel } from '@trade-platform/exac/shared/data';
import {
  UpdateTraderNoteDialogData,
  UpdateTraderNoteResult,
} from './models';
import {
  DEFAULT_MODAL_DURATION,
  DEFAULT_REASON_CODE,
  SUCCESS_UPDATE_SINGLE,
  SUCCESS_UPDATE_BATCH,
  ERROR_EXECUTION_ID_REQUIRED,
  ERROR_NO_EXECUTIONS_BATCH,
  ERROR_UPDATE_FAILED_UNKNOWN,
  ERROR_CHANGE_SERVICE_URL_REQUIRED,
  SNACKBAR_CLOSE,
  MAX_TRADER_NOTE_LENGTH,
} from './constants/default.constant';

@Component({
  selector: 'tp-update-trader-note',
  templateUrl: './update-trader-note.component.html',
  styleUrls: ['./update-trader-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
})
export class UpdateTraderNoteComponent implements OnInit, OnDestroy {
  public noteForm: FormGroup;
  public isProcessing = false;
  public errorMessages: string[] = [];
  public currentNote: string | null = null;
  public readonly MAX_TRADER_NOTE_LENGTH = MAX_TRADER_NOTE_LENGTH;

  private readonly traderNoteWhitespaceValidator = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const value = control.value as string;
    if (value && value.trim().length === 0) {
      return { whitespace: true };
    }
    return null;
  };

  private readonly destroy$ = new Subject<void>();

  public constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<UpdateTraderNoteComponent, UpdateTraderNoteResult>,
    private readonly snackBar: MatSnackBar,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: UpdateTraderNoteDialogData,
  ) {
    this.noteForm = this.createForm();
    this.updateTraderNoteControlState();
  }

  public ngOnInit(): void {
    if (this.data.executions.length === 1) {
      const existingNote = this.data.executions[0].traderNote;
      if (existingNote) {
        this.currentNote = existingNote;
      }
    }
    this.noteForm.patchValue({ reasonCode: DEFAULT_REASON_CODE });
    this.updateTraderNoteControlState();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public get executionCount(): number {
    return this.data.executions.length;
  }

  public get isSingleExecution(): boolean {
    return this.executionCount === 1;
  }

  public onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  public async onSubmit(): Promise<void> {
    if (this.noteForm.invalid) return;

    this.isProcessing = true;
    this.errorMessages = [];
    this.cdr.markForCheck();

    const { traderNote, reasonCode } = this.noteForm.value as {
      traderNote?: string;
      reasonCode: string;
    };
    const safeTraderNote = traderNote?.trim() ?? '';

    try {
      if (this.isSingleExecution) {
        await this.updateSingleExecution(this.data.executions[0], safeTraderNote, reasonCode);
        this.snackBar.open(SUCCESS_UPDATE_SINGLE, SNACKBAR_CLOSE, { duration: DEFAULT_MODAL_DURATION });
        this.dialogRef.close({ success: true, updatedCount: 1 });
      } else {
        const results = await this.updateMultipleExecutions(this.data.executions, safeTraderNote, reasonCode);
        const successCount = results.filter((r) => r).length;
        if (successCount > 0) {
          this.snackBar.open(SUCCESS_UPDATE_BATCH(successCount), SNACKBAR_CLOSE, { duration: DEFAULT_MODAL_DURATION });
          this.dialogRef.close({ success: true, updatedCount: successCount });
        } else {
          this.errorMessages = [ERROR_UPDATE_FAILED_UNKNOWN];
          this.cdr.markForCheck();
        }
      }
    } catch (error) {
      this.errorMessages = [error instanceof Error ? error.message : ERROR_UPDATE_FAILED_UNKNOWN];
      this.cdr.markForCheck();
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      reasonCode: ['', Validators.required],
      traderNote: [
        '',
        [
          Validators.required,
          Validators.maxLength(MAX_TRADER_NOTE_LENGTH),
          this.traderNoteWhitespaceValidator,
        ],
      ],
    });
  }

  private updateTraderNoteControlState(): void {
    const traderNoteControl = this.noteForm.get('traderNote');
    if (!traderNoteControl) return;
    if (this.isProcessing) {
      traderNoteControl.disable();
    } else {
      traderNoteControl.enable();
    }
  }

  private getChangeUrl(): string {
    if (!this.data.changeServiceUrl) {
      throw new Error(ERROR_CHANGE_SERVICE_URL_REQUIRED);
    }
    return this.data.changeServiceUrl;
  }

  private async updateSingleExecution(
    execution: ExecutionModel,
    traderNote: string,
    reasonCode: string,
  ): Promise<void> {
    if (!execution.executionId?.trim()) {
      throw new Error(ERROR_EXECUTION_ID_REQUIRED);
    }
    const url = `${this.getChangeUrl()}/executions/${execution.executionId}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    await this.http.patch(url, { traderNote, reasonCode }, { headers }).toPromise();
  }

  private async updateMultipleExecutions(
    executions: ExecutionModel[],
    traderNote: string,
    reasonCode: string,
  ): Promise<boolean[]> {
    if (executions.length === 0) {
      throw new Error(ERROR_NO_EXECUTIONS_BATCH);
    }
    return Promise.all(
      executions.map((exec) =>
        this.updateSingleExecution(exec, traderNote, reasonCode)
          .then(() => true)
          .catch(() => false),
      ),
    );
  }
}
