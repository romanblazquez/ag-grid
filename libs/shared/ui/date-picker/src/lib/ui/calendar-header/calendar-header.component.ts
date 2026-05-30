/*
 * Copyright (c) 2024 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Nov 26, 2024
 */

import { Component, inject } from '@angular/core';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { CannedDatesPickerComponent } from '../canned-dates-picker/canned-dates-picker.component';
import { DatePickerComponent } from '../../date-picker/date-picker.component';
import { DatePickerService } from '@fmr-pr000539/shared/data-access/date-picker';
import { CannedDateRange, DateRange } from '@fmr-pr000539/shared/data';

@Component({
  selector: 'fmr-pr000539-calendar-header',
  imports: [MatDatepickerModule, CannedDatesPickerComponent],
  templateUrl: './calendar-header.component.html',
  styleUrls: ['./calendar-header.component.scss'],
})
export class CalendarHeaderComponent {
  public cannedDates: CannedDateRange[] = [];

  public constructor(public datePickerService: DatePickerService) {
    this.cannedDates = this.datePickerService.cannedDates;
  }
  private readonly datePicker = inject(DatePickerComponent);

  protected onDateRangeSelected(event: {
    dateRange: DateRange;
    cannedDateRange: CannedDateRange;
  }): void {
    this.datePicker.onDateRangePickedFromCannedDates(
      event.dateRange,
      event.cannedDateRange,
    );
  }
}
