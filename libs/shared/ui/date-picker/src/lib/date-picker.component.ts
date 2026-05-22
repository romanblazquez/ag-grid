import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import {
  DATE_SELECTION_OPTIONS,
  DateRangeEvent,
  DateSelectionOption,
  DateSelectionType,
} from './date-range.model';
import { computePresetRange } from './date-range-presets';

@Component({
  selector: 'lib-date-picker',
  templateUrl: './date-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePicker, Select, FloatLabelModule],
})
export class DatePickerComponent {
  readonly allowFutureDates = input<boolean>(false);

  @Output() readonly dateRangeEvent = new EventEmitter<DateRangeEvent>();
  @Output() readonly errorMessage = new EventEmitter<string>();

  readonly presetOptions: DateSelectionOption[] = DATE_SELECTION_OPTIONS;
  selectedPreset: DateSelectionType = DateSelectionType.Custom;
  range: Date[] | null = null;
  readonly today = new Date();

  onPresetChange(type: DateSelectionType): void {
    if (type === DateSelectionType.Custom) return;
    const r = computePresetRange(type);
    if (!r) return;
    this.range = [r.startDate, r.endDate];
    this.emit(type);
  }

  onCalendarChange(): void {
    if (!this.range || this.range.length < 2 || !this.range[0] || !this.range[1]) {
      return;
    }
    this.selectedPreset = DateSelectionType.Custom;
    this.emit(DateSelectionType.Custom);
  }

  onClear(): void {
    this.range = null;
    this.selectedPreset = DateSelectionType.Custom;
    this.errorMessage.emit('');
  }

  clearDatePicker(): void {
    this.onClear();
  }

  private emit(type: DateSelectionType): void {
    if (!this.range || this.range.length < 2) return;
    const [startDate, endDate] = this.range;
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      this.errorMessage.emit('Start date must be before end date');
      return;
    }
    this.errorMessage.emit('');
    this.dateRangeEvent.emit({
      dateRange: { startDate, endDate },
      dateSelectionType: type,
    });
  }
}
