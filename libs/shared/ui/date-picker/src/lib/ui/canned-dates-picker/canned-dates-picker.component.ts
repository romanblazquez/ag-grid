/*
 * Copyright (c) 2024 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Nov 26, 2024
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CannedDateRange, DateRange } from '@fmr-pr000539/shared/data';
import { DateRangeCalculatorService } from '@fmr-pr000539/shared/data-access/date-picker';

@Component({
  selector: 'fmr-pr000539-canned-dates-picker',
  imports: [ButtonModule],
  providers: [DateRangeCalculatorService],
  templateUrl: './canned-dates-picker.component.html',
  styleUrls: ['./canned-dates-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CannedDatesPickerComponent {
  @Input() public cannedDates: CannedDateRange[] =
    Object.values(CannedDateRange);
  @Output() public dateRangeSelected = new EventEmitter<{
    dateRange: DateRange;
    cannedDateRange: CannedDateRange;
  }>();

  private readonly dateRangeCalculator = inject(DateRangeCalculatorService);

  public onCannedDatePicked(cannedDate: CannedDateRange): void {
    const dateRange = this.dateRangeCalculator.calculateDateRange(cannedDate);
    this.dateRangeSelected.emit({ dateRange, cannedDateRange: cannedDate });
  }
}
