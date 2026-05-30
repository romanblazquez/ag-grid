import { DatePickerModule, DatePicker } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { PaginatorModule } from 'primeng/paginator';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import moment from 'moment';
import {
  CannedDateRange,
  DateSelectionType,
  DateRange,
} from '@fmr-pr000539/shared/data';
import { DateRangeEvent } from '../models';
import {
  debounceTime,
  distinct,
  distinctUntilChanged,
  interval,
  Subject,
  takeUntil,
} from 'rxjs';
import { CannedDatesPickerComponent } from '../ui/canned-dates-picker/canned-dates-picker.component';
import { DatePickerForm } from '../models/date-picker-form.type';
import {
  DatePickerService,
  DateRangeCalculatorService,
} from '@fmr-pr000539/shared/data-access/date-picker';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

/**
 * Component that displays a date range input box together with a calendar picker and a canned date range selections
 * it displays following date range selections by default: today, yesterday, this week, last 14 days, last 30 days, last 60 days
 * last 90 days, MTD, QTD, YTD.
 */
@Component({
  selector: 'fmr-pr000539-date-picker',
  imports: [
    DatePickerModule,
    FloatLabelModule,
    MessageModule,
    PaginatorModule,
    ReactiveFormsModule,
    CannedDatesPickerComponent,
  ],
  providers: [DateRangeCalculatorService],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent implements OnInit, OnDestroy {
  /**
   * Optional canned dates to use instead of the default ones.
   */
  @Input() public cannedDates: CannedDateRange[] =
    Object.values(CannedDateRange);

  @Input()
  public additionalValidators: ValidatorFn[] = [];

  /**
   * When true, allows selection of future dates in the date picker.
   * When false (default), future dates are disabled and validation prevents future date selection.
   */
  @Input()
  public get allowFutureDates(): boolean {
    return this._allowFutureDates;
  }
  public set allowFutureDates(value: boolean) {
    const previousValue = this._allowFutureDates;
    this._allowFutureDates = value;

    // Only update validators if value actually changed
    if (previousValue !== value) {
      this.updateFutureDateValidator();
    }
  }
  private _allowFutureDates = false;

  public readonly datePickerService = inject(DatePickerService);
  private readonly dateRangeCalculator = inject(DateRangeCalculatorService);
  private readonly cdr = inject(ChangeDetectorRef);
  /**
   * Emits selected date range.
   */
  @Output() public dateRangeEvent = new EventEmitter<DateRangeEvent>();
  @Output() public errorMessage = new EventEmitter<string>();
  @Output() public isDateRangeValid = new EventEmitter<boolean>();
  public isPredefinedDateRangeUsed = false;
  /** Tracks the currently selected predefined date range (e.g., "Today", "Last 30 Days") for midnight updates */
  private selectedCannedDateRange: CannedDateRange | null = null;
  /** Tracks the last known date string to detect midnight/date changes */
  private lastKnownDate = '';
  protected dateRangeError: string | null = null;
  protected todayDate!: Date;
  protected error = '';
  protected readonly startDateControl = new FormControl<Date | null>(null, [
    Validators.required,
  ]);
  protected readonly endDateControl = new FormControl<Date | null>(null, [
    Validators.required,
  ]);

  /**
   * Single control bound to PrimeNG's range datepicker (Date[] of length 2).
   * Mirrored into the legacy `startDateControl`/`endDateControl` so external
   * consumers (and validators) continue to work.
   */
  protected readonly rangeControl = new FormControl<Date[] | null>(null);

  public readonly dateRangeGroup = new FormGroup<DatePickerForm>({
    startDate: this.startDateControl,
    endDate: this.endDateControl,
  });
  /**
   * Reference to the internal PrimeNG DatePicker overlay so we can
   * programmatically close it after a canned-range selection.
   * @private
   */
  @ViewChild('rangePicker')
  private readonly rangePicker!: DatePicker;
  private readonly $destroy = new Subject();
  /** Cached reference to the future date validator for proper add/remove operations */
  private readonly futureDateValidatorRef: ValidatorFn =
    this.dateNotInFutureValidator();

  public get startDate(): Date {
    return this.startDateControl.value as Date;
  }

  public set startDate(value: Date | null) {
    this.startDateControl.setValue(value);
  }

  public get endDate(): Date | null {
    return this.endDateControl.value as Date;
  }

  public set endDate(value: Date | null) {
    this.endDateControl.setValue(value);
  }

  public ngOnInit(): void {
    this.lastKnownDate = new Date().toDateString();
    this.todayDate = this.getNewDate();
    this.startDate = this.getNewDate();
    this.endDate = this.getNewDate();
    this.syncRangeControlFromGroup();

    // Set up future date validator based on allowFutureDates input
    this.updateFutureDateValidator();

    this.bindToParentForm();
    this.subscribeToChangesInDateRange();
    this.subscribeToRangeControlChanges();
    this.datePickerService.cannedDates = this.cannedDates;

    interval(60 * 1000)
      .pipe(takeUntil(this.$destroy))
      .subscribe(() => this.handleMidnightUpdate());
  }

  public ngOnDestroy(): void {
    this.$destroy.next(true);
    this.$destroy.complete();
  }

  /**
   * Handles midnight date changes by recalculating predefined date ranges.
   * This method is called periodically via RxJS interval to detect when the system date changes.
   * It handles both forward (normal midnight) and backward (timezone travel) date changes.
   *
   * The method always updates todayDate when the date changes to ensure proper validation.
   * It recalculates date ranges only if a predefined canned date range is currently selected.
   *
   * Manual date selections are not affected by this update.
   */
  private handleMidnightUpdate(): void {
    const currentDate = new Date().toDateString();
    if (currentDate === this.lastKnownDate) {
      return;
    }

    this.lastKnownDate = currentDate;
    this.todayDate = this.getNewDate();

    if (!this.selectedCannedDateRange) {
      this.endDateControl.updateValueAndValidity();
      this.cdr.markForCheck();
      return;
    }

    const recalculatedRange = this.recalculatePredefinedDateRange(
      this.selectedCannedDateRange,
    );
    this.startDate = recalculatedRange.startDate;
    this.endDate = recalculatedRange.endDate;
    this.syncRangeControlFromGroup();
    this.startDateControl.updateValueAndValidity();
    this.endDateControl.updateValueAndValidity();
    this.dateRangeGroup.updateValueAndValidity();
    this.onDateRangeChanged(DateSelectionType.PreDefinedDateRange);
    this.isDateRangeValid.emit(this.dateRangeGroup.valid);

    this.cdr.markForCheck();
  }

  /**
   * Function that will check if dateRange is valid and will emit dateRangeSelected if so.
   */
  public onDateRangeChanged(dateSelectionType: DateSelectionType): void {
    if (this.isDatePickerValid()) {
      const dateRange: DateRange = {
        startDate: this.startDate!,
        endDate: this.endDate!,
      };
      this.dateRangeEvent.emit({
        dateSelectionType,
        dateRange,
      });
    } else {
      this.error = this.getErrorMessage();
    }
    this.errorMessage.emit(this.getErrorMessage());
  }

  public isDatePickerValid(): boolean {
    this.dateRangeGroup.get('startDate')?.updateValueAndValidity();
    this.dateRangeGroup.get('endDate')?.updateValueAndValidity();
    return (
      this.dateRangeGroup.valid &&
      this.startDateControl.valid &&
      this.endDateControl.valid
    );
  }

  public clearDatePicker(): void {
    this.dateRangeError = '';
    this.startDateControl.setValue(this.getNewDate());
    this.endDateControl.setValue(this.getNewDate());
    this.syncRangeControlFromGroup();
  }

  public closeDatePicker(): void {
    this.rangePicker?.overlayVisible && this.rangePicker.hideOverlay();
  }

  /**
   * Function that verifies if current date range is permitted.
   */

  public isInPermittedRange(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = moment(this.startDate);
      const end = moment(this.endDate);

      if (start.isAfter(end)) {
        return { startDateMustOccurBeforeEndDate: true };
      }

      const totalDays = end.diff(start, 'days');
      const daysInLeapYear = 366;
      const daysInRegularYear = 365;

      if (totalDays > daysInRegularYear && !this.includesLeapDay(start, end)) {
        return { enterRangeOfOneYearOrLess: true };
      } else if (totalDays > daysInLeapYear) {
        return { enterRangeOfOneYearOrLess: true };
      }

      return null;
    };
  }

  /**
   * Updates the future date validator on endDateControl based on allowFutureDates setting.
   * Adds the validator when future dates are not allowed, removes it when they are allowed.
   * Called from ngOnInit and when allowFutureDates input changes dynamically.
   */
  private updateFutureDateValidator(): void {
    if (!this.allowFutureDates) {
      // Add validator if future dates are not allowed
      this.endDateControl.addValidators(this.futureDateValidatorRef);
    } else {
      // Remove the future date validator when future dates are allowed
      this.endDateControl.removeValidators(this.futureDateValidatorRef);
    }
    this.endDateControl.updateValueAndValidity();
  }

  public dateNotInFutureValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const dateValue: Date = control.value as Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(dateValue);
      endDate.setHours(0, 0, 0, 0);
      if (endDate > today) {
        return { endDateInFuture: true };
      }
      return null;
    };
  }

  /**
   * Handles selection of predefined (canned) date ranges.
   * Stores the selected canned range type to enable midnight auto-recalculation.
   * @param dateRange The calculated date range
   * @param cannedDateRange The type of predefined range selected (optional)
   */
  public onDateRangePickedFromCannedDates(
    dateRange: DateRange,
    cannedDateRange?: CannedDateRange,
  ): void {
    this.isPredefinedDateRangeUsed = true;
    this.selectedCannedDateRange = cannedDateRange || null;
    this.startDate = dateRange.startDate;
    this.endDate = dateRange.endDate;
    this.syncRangeControlFromGroup();
    this.closeDatePicker();
  }

  public onDatePickerOpen(): void {
    this.handleMidnightUpdate();
  }

  public onDatePickerClosed(): void {
    if (!this.endDate) {
      this.endDate = this.startDate;
    }
  }

  protected includesLeapDay(
    startDate: moment.Moment,
    endDate: moment.Moment,
  ): boolean {
    const febDaysInLeapYear = 29;
    for (
      let m = moment(startDate);
      m.isSameOrBefore(endDate);
      m.add(1, 'day')
    ) {
      if (m.month() === 1 && m.date() === febDaysInLeapYear && m.isLeapYear()) {
        return true;
      }
    }
    return false;
  }

  protected getErrorMessage(): string {
    if (this.hasError(this.dateRangeGroup, 'startDateMustOccurBeforeEndDate')) {
      return 'Invalid Range';
    }
    if (this.endDateControl.hasError('endDateInFuture')) {
      return "End Date can't be in future";
    }
    if (this.hasError(this.dateRangeGroup, 'rangeOfMoreThanTwoWeeks')) {
      return 'Max 2 Weeks';
    }
    if (this.hasError(this.dateRangeGroup, 'enterRangeOfOneYearOrLess')) {
      return 'Max One Year';
    }
    if (this.endDateControl.hasError('required')) {
      return 'End Date required';
    }
    if (this.startDateControl.hasError('required')) {
      return 'Start Date required';
    }
    return '';
  }

  protected subscribeToChangesInDateRange(): void {
    this.dateRangeGroup.valueChanges
      .pipe(
        takeUntil(this.$destroy),
        debounceTime(100),
        distinct(),
        distinctUntilChanged((prev, curr) => {
          const isStartDateTheSame = this.isSameDay(
            prev.startDate ?? null,
            curr.startDate ?? null,
          );
          const isEndDateTheSame = this.isSameDay(
            prev.endDate ?? null,
            curr.endDate ?? null,
          );
          return isStartDateTheSame && isEndDateTheSame;
        }),
      )
      .subscribe(() => {
        this.onDateRangeChanged(
          this.isPredefinedDateRangeUsed
            ? DateSelectionType.PreDefinedDateRange
            : DateSelectionType.DatePicker,
        );
        // Reset predefined tracking when user manually changes dates
        if (!this.isPredefinedDateRangeUsed) {
          this.selectedCannedDateRange = null;
        }
        this.isPredefinedDateRangeUsed = false;
      });
  }

  private hasError(formGroup: FormGroup, errorKey: string): boolean {
    if (formGroup.errors)
      return Object.prototype.hasOwnProperty.call(formGroup.errors, errorKey);
    return false;
  }

  private getNewDate(): Date {
    const newDate = new Date();
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  private bindToParentForm(): void {
    this.dateRangeGroup.addControl('startDate', this.startDateControl);
    this.dateRangeGroup.addControl('endDate', this.endDateControl);
    this.dateRangeGroup.addValidators([this.isInPermittedRange()]);
    if (this.additionalValidators.length > 0) {
      this.dateRangeGroup.addValidators(this.additionalValidators);
    }
  }

  /**
   * Recalculates the date range based on the predefined canned date range type.
   * This handles both forward (normal midnight) and backward (timezone travel) date changes.
   * @param cannedDateRange The predefined date range type to recalculate
   * @returns The recalculated date range based on the current date
   */
  private recalculatePredefinedDateRange(
    cannedDateRange: CannedDateRange,
  ): DateRange {
    return this.dateRangeCalculator.calculateDateRange(cannedDateRange);
  }

  private isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    const momentDate1 = moment(date1);
    const momentDate2 = moment(date2);
    return momentDate1.isSame(momentDate2, 'day');
  }

  /**
   * Pushes the start/end values from the form group into PrimeNG's single
   * `rangeControl` (which expects a `Date[]` of length 2). Used when the
   * range is set programmatically (canned dates, midnight refresh, clear).
   */
  private syncRangeControlFromGroup(): void {
    const start = this.startDate ?? null;
    const end = this.endDate ?? null;
    const next: Date[] | null =
      start && end ? [start, end] : start ? [start] : null;
    this.rangeControl.setValue(next, { emitEvent: false });
  }

  /**
   * Mirrors PrimeNG datepicker selections (a `Date[]`) back into the
   * legacy start/end FormControls so existing validators, outputs and
   * consumer bindings keep working unchanged.
   */
  private subscribeToRangeControlChanges(): void {
    this.rangeControl.valueChanges
      .pipe(takeUntil(this.$destroy))
      .subscribe((range) => {
        const [start = null, end = null] = range ?? [];
        if (!this.isSameDay(start, this.startDate)) {
          this.startDateControl.setValue(start);
        }
        if (!this.isSameDay(end, this.endDate)) {
          this.endDateControl.setValue(end);
        }
      });
  }
}
