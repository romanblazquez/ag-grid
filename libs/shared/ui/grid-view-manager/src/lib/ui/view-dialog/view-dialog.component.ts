import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Dialog,
    InputText,
    FloatLabel,
    Button,
    Message,
  ],
  templateUrl: './view-dialog.component.html',
  styleUrls: ['./view-dialog.component.scss'],
})
export class ViewDialogComponent implements OnChanges {
  @Input() public visible = false;
  @Output() public visibleChange = new EventEmitter<boolean>();

  @Input() public isEditMode = false;
  @Input() public initialData: Partial<Record<string, unknown>> & {
    name?: string;
  } = {};
  @Input() public errorMessages: string[] = [];
  @Input() public isProcessing = false;

  @Output() public save = new EventEmitter<{
    mode: 'create' | 'edit';
    name: string;
  }>();
  @Output() public cancelDialog = new EventEmitter<void>();

  public viewForm: FormGroup;

  public constructor(private readonly fb: FormBuilder) {
    this.viewForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes && changes['visible'].currentValue === true) {
      this.viewForm.reset({ name: this.initialData.name ?? '' });
    }
  }

  public get dialogHeader(): string {
    return this.isEditMode ? 'Name View' : 'Create View';
  }

  public onCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancelDialog.emit();
  }

  public onSave(): void {
    if (this.viewForm.valid) {
      const { name } = this.viewForm.value as { name: string };
      this.save.emit({
        name,
        mode: this.isEditMode ? 'edit' : 'create',
      });
      this.visible = false;
      this.visibleChange.emit(false);
    }
  }
}
