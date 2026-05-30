/*
 * Copyright (c) 2024 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Nov 26, 2024
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CannedDatesPickerComponent } from './canned-dates-picker.component';
import { CannedDateRange } from '@fmr-pr000539/shared/data';

describe('CannedDatesPickerComponent', () => {
  let component: CannedDatesPickerComponent;
  let fixture: ComponentFixture<CannedDatesPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CannedDatesPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CannedDatesPickerComponent);
    component = fixture.componentInstance;
    jest.useFakeTimers();
    fixture.detectChanges();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default cannedDates if none was provided', () => {
    const defaultCannedDates: CannedDateRange[] =
      Object.values(CannedDateRange);
    fixture.detectChanges();
    expect(component.cannedDates).toStrictEqual(defaultCannedDates);
  });

  it('should emit today date range if today was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    //   act
    component.onCannedDatePicked(CannedDateRange.Today);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate: today, endDate: today },
      cannedDateRange: CannedDateRange.Today,
    });
  });

  it('should emit yesterday date range if yesterday was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    jest.setSystemTime(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.Yesterday);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate: yesterday, endDate: yesterday },
      cannedDateRange: CannedDateRange.Yesterday,
    });
  });

  it('should emit date range from previous sunday until today This week was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date(2024, 11, 5);
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(2024, 11, 1);
    startDate.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);

    //   act
    component.onCannedDatePicked(CannedDateRange.ThisWeek);

    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.ThisWeek,
    });
  });

  it('should emit last 14 days date range if Last 14 Days was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 14);
    startDate.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.Last14Days);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.Last14Days,
    });
  });

  it('should emit last 30 days date range if Last 30 Days was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.Last30Days);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.Last30Days,
    });
  });

  it('should emit last 60 days date range if Last 60 Days was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 60);
    startDate.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.Last60Days);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.Last60Days,
    });
  });

  it('should emit last 90 days date range if Last 90 Days was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 90);
    startDate.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.Last90Days);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.Last90Days,
    });
  });

  it('should emit last MTD days date range if MTD was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.MTD);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate, endDate: today },
      cannedDateRange: CannedDateRange.MTD,
    });
  });

  it('should emit last QTD days date range if QTD was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const currentMonth = today.getMonth();
    const startMonthQuarter = Math.floor(currentMonth / 3) * 3;
    const qtd = new Date(today.getFullYear(), startMonthQuarter, 1);
    qtd.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.QTD);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate: qtd, endDate: today },
      cannedDateRange: CannedDateRange.QTD,
    });
  });

  it('should emit last YTD days date range if YTD was selected', () => {
    // arrange
    component.dateRangeSelected.emit = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jest.setSystemTime(today);
    const ytd = new Date(today.getFullYear(), 0, 1);
    ytd.setHours(0, 0, 0, 0);
    //   act
    component.onCannedDatePicked(CannedDateRange.YTD);
    //   assert
    expect(component.dateRangeSelected.emit).toHaveBeenCalledWith({
      dateRange: { startDate: ytd, endDate: today },
      cannedDateRange: CannedDateRange.YTD,
    });
  });
});
