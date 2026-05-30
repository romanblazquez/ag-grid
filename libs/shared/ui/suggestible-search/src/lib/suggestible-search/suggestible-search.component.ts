/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:51 PM
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { SuggestibleSearchResponse } from '@fmr-pr000539/shared/data';
import { SuggestibleSearchService } from '@fmr-pr000539/shared/data-access/suggestible-search';
import { Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { SuggestibleSearchSuggestion } from '../domain/suggestible-search-bar.model';
import {
  displayFunction,
  enableClearButton,
  placeholderSuffix,
  SearchContext,
  searchPlaceholder,
  searchResultColumns,
  searchResultColumnsToolTip,
  searchResultColumnWidths,
  suggestibleSearchEndpoint,
} from '../domain/suggestible-search-bar.constant';
import { TrackingService } from '@fmr-pr000539/eqt-tracking-module';
import { SuggestibleServiceAbstract } from '../domain/suggestible-service.abstract';

/**
 * Reusable smart component for all suggestible search capabilities.
 * The searchContext drives the rules based configuration for data fetch and presentation.
 */
@Component({
  selector: 'fmr-pr000539-suggestible-search',
  templateUrl: './suggestible-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SuggestibleSearchComponent {
  public placeholder: string = placeholderSuffix;
  public searchResultColumns: Array<string> = [];
  public searchResultColumnWidths: Array<number> = [];
  public searchResultColumnsToolTip: Array<string> | undefined;
  public displayFunction:
    | ((suggestion: SuggestibleSearchSuggestion) => string)
    | undefined;
  public suggestibleSearchResults:
    | Observable<Array<SuggestibleSearchSuggestion>>
    | undefined;
  @Input()
  public disabled = false;
  @Input()
  public hideArrowDropDown = false;
  @Input()
  public searchBarWidth: string | undefined;
  @Input()
  public placeholderText: string | undefined;
  @Input()
  public dropDownWidth: string | undefined;
  @Input()
  public defaultSuggestions:
    | Array<SuggestibleSearchSuggestion>
    | undefined
    | null;
  @Input()
  public errorMessage: string | undefined;
  @Input()
  public useMatError = false;
  @Input()
  public requiredSearch = false;
  @Input()
  public searchTouched = false;
  @Input()
  public autoSelectFirstOptionOnUpdate = false;
  @Input()
  public clearSymbol: any;
  @Input()
  public suggestibleServiceOverride?: SuggestibleServiceAbstract;
  @Output()
  public selectEvent = new EventEmitter<SuggestibleSearchSuggestion>();
  @Output()
  public clearEvent = new EventEmitter<string>();
  public enableClearButton = false;
  private suggestibleSearchEndpoint: keyof SuggestibleSearchService =
    'getSecurity';

  public constructor(
    private readonly suggestibleSearchService: SuggestibleSearchService,
    private readonly trackingService: TrackingService,
  ) {}

  private _searchContext: SearchContext = SearchContext.Company;

  public get searchContext(): SearchContext {
    return this._searchContext;
  }

  @Input()
  public set searchContext(searchContext: SearchContext | null) {
    this._searchContext = searchContext as SearchContext;
    this.setContextConfiguration();
  }

  public getSuggestions(searchQuery: string): void {
    this.suggestibleSearchResults = (
      this.suggestibleServiceOverride
        ? this.suggestibleServiceOverride.search(searchQuery)
        : (this.suggestibleSearchService[this.suggestibleSearchEndpoint](
            searchQuery,
          ) as Observable<
            SuggestibleSearchResponse<SuggestibleSearchSuggestion>
          >)
    ).pipe(
      filter(
        (suggestibleSearchResponse) =>
          !!(
            // eslint-disable-next-line -- Prefer using an optional chain expression instead, as it's more concise and easier to read.eslint@typescript-eslint/prefer-optional-chain
            (suggestibleSearchResponse && suggestibleSearchResponse.suggestions)
          ),
      ),
      map((suggestibleSearchResponse) => suggestibleSearchResponse.suggestions),
      tap({
        next: () => (this.errorMessage = undefined),
        error: () =>
          (this.errorMessage = `System error occurred while searching ${searchQuery}. Please try again later.`),
      }),
    );
  }

  public selectSuggestion(selectSuggestion: SuggestibleSearchSuggestion): void {
    this.selectEvent.emit(selectSuggestion);
  }

  public clearSearch(fundName: string): void {
    this.clearEvent.emit(fundName);
  }

  private setContextConfiguration(): void {
    this.suggestibleSearchEndpoint =
      suggestibleSearchEndpoint[this._searchContext];
    this.placeholderText = searchPlaceholder[this._searchContext];
    this.searchResultColumns = searchResultColumns[this._searchContext];
    this.searchResultColumnWidths =
      searchResultColumnWidths[this._searchContext];
    this.searchResultColumnsToolTip =
      searchResultColumnsToolTip[this._searchContext];
    this.displayFunction = displayFunction[this._searchContext];
    this.enableClearButton = enableClearButton[this._searchContext];
  }
}
