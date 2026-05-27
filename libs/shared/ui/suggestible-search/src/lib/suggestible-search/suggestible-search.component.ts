import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { SearchBarComponent } from '@trade-platform/shared/ui/search-bar';
import {
  SuggestibleSearchResponse,
  SuggestibleSearchSuggestion,
} from '../domain/suggestible-search-bar.model';
import {
  displayFunction,
  enableClearButton,
  placeholderSuffix,
  SearchContext,
  searchPlaceholder,
  searchResultColumns,
  searchResultColumnsToolTip,
  searchResultColumnWidths,
} from '../domain/suggestible-search-bar.constant';
import { SuggestibleServiceAbstract } from '../domain/suggestible-service.abstract';

/**
 * Reusable smart component for all suggestible search capabilities.
 * The searchContext drives the rules-based configuration for data fetch and presentation.
 *
 * Usage:
 *   <tp-suggestible-search
 *     [searchContext]="SearchContext.Company"
 *     [suggestibleServiceOverride]="myService"
 *     (selectEvent)="onSelect($event)"
 *     (clearEvent)="onClear($event)"
 *   ></tp-suggestible-search>
 *
 * When no suggestibleServiceOverride is provided a default no-op service is used and
 * getSuggestions() will produce no results — callers should always supply an override.
 */
@Component({
  selector: 'tp-suggestible-search',
  standalone: true,
  imports: [AsyncPipe, SearchBarComponent],
  templateUrl: './suggestible-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  @Input() public disabled = false;
  @Input() public hideArrowDropDown = false;
  @Input() public searchBarWidth: string | undefined;
  @Input() public placeholderText: string | undefined;
  @Input() public dropDownWidth: string | undefined;
  @Input() public defaultSuggestions:
    | Array<SuggestibleSearchSuggestion>
    | undefined
    | null;
  @Input() public errorMessage: string | undefined;
  @Input() public useMatError = false;
  @Input() public requiredSearch = false;
  @Input() public searchTouched = false;
  @Input() public autoSelectFirstOptionOnUpdate = false;
  @Input() public clearSymbol: unknown;
  /** Provide a domain-specific service to drive suggestions. */
  @Input() public suggestibleServiceOverride?: SuggestibleServiceAbstract;

  @Output() public selectEvent =
    new EventEmitter<SuggestibleSearchSuggestion>();
  @Output() public clearEvent = new EventEmitter<string>();

  public enableClearButton = false;

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
    if (!this.suggestibleServiceOverride) {
      return;
    }

    this.suggestibleSearchResults =
      this.suggestibleServiceOverride.search(searchQuery).pipe(
        filter(
          (response: SuggestibleSearchResponse<SuggestibleSearchSuggestion>) =>
            !!(response && response.suggestions),
        ),
        map(
          (response: SuggestibleSearchResponse<SuggestibleSearchSuggestion>) =>
            response.suggestions,
        ),
        tap({
          next: () => (this.errorMessage = undefined),
          error: () =>
            (this.errorMessage = `System error occurred while searching ${searchQuery}. Please try again later.`),
        }),
      );
  }

  public selectSuggestion(suggestion: SuggestibleSearchSuggestion): void {
    this.selectEvent.emit(suggestion);
  }

  public clearSearch(value: string): void {
    this.clearEvent.emit(value);
  }

  private setContextConfiguration(): void {
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
