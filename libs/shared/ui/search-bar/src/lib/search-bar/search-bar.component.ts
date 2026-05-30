/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:49 PM
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { debounceTime, filter, tap } from 'rxjs/operators';

/**
 * Reusable and extensible presentation component for all intuitive search capabilities.
 * It emits an event for all search actions and displays the results based off input attribute.
 * It includes an optional default results to show via drop down and an optional clear text button.
 */
@Component({
  selector: 'fmr-pr000539-search-bar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
    MatGridListModule,
  ],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent<T> implements OnInit {
  public searchFormControl = new FormControl();
  public isInputInFocus = false;
  @Input()
  public placeholderText = 'Search';
  @Input()
  public disabled = false;
  @Input()
  public hideArrowDropDown = false;
  @Input()
  public enableClearButton = true;
  @Input()
  public debounceTime = 300;
  @Input()
  public searchResults: Array<T> | undefined | null;
  @Input()
  public autoSelectFirstOptionOnUpdate = false;
  @Input()
  public searchResultColumns: Array<string> | undefined;
  @Input()
  public searchResultColumnsToolTip: Array<string> | undefined;
  @Input()
  public searchResultColumnWidths: Array<number> | undefined;
  @Input()
  public searchBarWidth = '200';
  @Input()
  public dropDownWidth: string | undefined = this.searchBarWidth;
  @Input()
  public displayFunction: ((suggestion: T) => string) | undefined;
  @Input()
  public errorMessage: string | undefined;
  @Input()
  public useMatError: boolean | undefined;
  @Output()
  public searchEvent = new EventEmitter<string>();
  @Output()
  public clearEvent = new EventEmitter<string>();
  @Output()
  public selectEvent = new EventEmitter<T>();
  @Output()
  public tooltipOpen = new EventEmitter<string>();
  @ViewChild(MatAutocompleteTrigger, { static: false })
  public matAutocompleteTrigger: MatAutocompleteTrigger | undefined;

  private _defaultResults: Array<T> | undefined;

  public get defaultResults(): Array<T> | undefined {
    return this._defaultResults;
  }

  @Input()
  public set defaultResults(defaultResults: Array<T> | undefined) {
    this._defaultResults = defaultResults;
    if (this._defaultResults) {
      if (this.autoSelectFirstOptionOnUpdate) {
        this.searchFormControl.value
          ? this.selectFirstResult(this.defaultResults)
          : this.selectFirstResult(this.defaultResults, true);
      } else if (!this.searchFormControl.value) {
        this.selectFirstResult(this.defaultResults);
      }
    }
  }

  @Input()
  public set requiredSearch(required: boolean) {
    if (required) {
      this.searchFormControl.setValidators([Validators.required]);
    }
  }

  @Input()
  public set searchTouched(touched: boolean) {
    if (touched) {
      this.searchFormControl.markAsTouched();
    } else {
      this.searchFormControl.markAsUntouched();
    }
  }

  @Input()
  public set clearSymbol(clear: any) {
    if (clear) {
      this.clearSearch(new Event(''));
    }
  }

  public ngOnInit(): void {
    this.getSearchResults();
  }

  public selectResult(event: MatAutocompleteSelectedEvent): void {
    this.selectEvent.emit(event.option.value as T);
    this.isInputInFocus = false;
    this.errorMessage = undefined;
  }

  public selectFirstResult(
    results = this.searchResults,
    isAutoSelectUpdate = false,
  ): void {
    if (results && results.length > 0) {
      this.searchFormControl.setValue(results[0]);
      if (!isAutoSelectUpdate) {
        this.selectEvent.emit(results[0]);
      }
      this.isInputInFocus = false;
    }
  }

  public clearSearch(event: Event): void {
    event.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.clearEvent.emit(this.searchFormControl.value);
    this.searchFormControl.setValue('');
    this.searchResults = [];
  }

  public showDefaultResults(event: Event): void {
    event.stopPropagation();
    this.searchResults = this.defaultResults;
    this.matAutocompleteTrigger?.openPanel();
  }

  public onInputFocus(): void {
    this.isInputInFocus = true;
  }

  public onInputBlur(): void {
    this.isInputInFocus = false;
  }

  public get canShowResults(): boolean {
    return !!(
      this.searchResults &&
      this.searchResultColumns &&
      this.searchResultColumnWidths
    );
  }

  public getSearchResultByColumn(
    searchResult: T,
    searchResultColumn: string,
  ): string {
    return (searchResult as Record<string, unknown>)[
      searchResultColumn
    ] as string;
  }

  protected onTooltipOpen(columnTooltip: string): void {
    this.tooltipOpen.emit(columnTooltip);
  }

  protected onInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.value === '') {
      this.clearSearch(event);
    }
  }

  private getSearchResults(): void {
    this.searchFormControl.valueChanges
      .pipe(
        tap(() => (this.isInputInFocus = true)),
        tap(() => (this.searchResults = [])),
        debounceTime(this.debounceTime),
        tap(() => (this.errorMessage = undefined)),
        filter(
          (searchQuery) => !!(searchQuery && typeof searchQuery === 'string'),
        ),
        tap((searchQuery: string) => this.searchEvent.emit(searchQuery)),
      )
      .subscribe();
  }
}
