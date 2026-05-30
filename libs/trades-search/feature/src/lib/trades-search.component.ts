import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import {
  DataAccessFacadeService,
  CommonSearchValue,
  HdsCommonSearchComponent,
  SearchContext,
  SearchType,
  TreeNode,
} from '@trade-platform/shared/ui/hds-common-search';
import {
  LegacyDataAccessFacadeService,
  BrokersService,
  CodeValueService,
  PersonDirectoryService,
  PersonSearchService,
  PortfolioService,
  ParentBrokerSearchService,
  PersonService as SharedPersonServiceToken,
  SecurityService,
  TeamSearchService,
  TraderTeamSearchService,
} from '@trade-platform/shared/ui/common-search';
import {
  DatePickerComponent,
  DateRangeEvent,
} from '@trade-platform/shared/ui/date-picker';
import {
  TradesSearchFacadeService,
  getInteractionTypeFromEvent,
} from '@trade-platform/exac/trades-search/data-access';

@Component({
  selector: 'lib-trades-search',
  templateUrl: './trades-search.component.html',
  styleUrl: './trades-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DividerModule,
    HdsCommonSearchComponent,
    DatePickerComponent,
  ],
  providers: [
    DataAccessFacadeService,
    LegacyDataAccessFacadeService,
    BrokersService,
    CodeValueService,
    PersonSearchService,
    PortfolioService,
    ParentBrokerSearchService,
    PersonDirectoryService,
    SecurityService,
    TeamSearchService,
    TraderTeamSearchService,
    { provide: SharedPersonServiceToken, useExisting: PersonDirectoryService },
  ],
})
export class TradesSearchComponent {
  private readonly tradesSearchFacade = inject(TradesSearchFacadeService);

  readonly formGroup = new FormGroup({});

  readonly symbolSearchContext: SearchContext = {
    searchType: SearchType.Symbol,
  };

  readonly brokerSearchContext: SearchContext = {
    searchType: SearchType.Broker,
  };

  readonly traderSearchContext: SearchContext = {
    searchType: SearchType.Trader,
  };

  readonly instrumentTypeSearchContext: SearchContext = {
    searchType: SearchType.InstrumentType,
    disableRules: {
      tree: (node: TreeNode) => {
        const item = node.items[0];
        const code = item.value as string;
        return code.toUpperCase() === 'CS';
      },
    },
  };

  readonly fundSearchContext = computed<SearchContext | null>(() =>
    this.tradesSearchFacade.isExecutionsContext()
      ? null
      : { searchType: SearchType.FundPm },
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  readonly dateError = signal('');
  readonly clearSignal = signal<object | undefined>(undefined);
  readonly includeCancelled = this.tradesSearchFacade.areCancelledTradesEnabled;
  readonly isSearchActive = computed(() => this.tradesSearchFacade.hasAnyFilter());
  readonly datePicker = viewChild<DatePickerComponent>('datePicker');

  // ── Selection handlers ────────────────────────────────────────────────────
  selectCompanySuggestion(selected: CommonSearchValue[]): void {
    this.tradesSearchFacade.updateCusip(this.toStrings(selected));
  }
  selectFundSuggestion(selected: CommonSearchValue[]): void {
    this.tradesSearchFacade.updateFunds(this.toStrings(selected));
  }
  selectBrokerSuggestion(selected: CommonSearchValue[]): void {
    this.tradesSearchFacade.updateBrokers(this.toNumbers(selected));
  }
  selectInstrumentTypesSuggestion(selected: CommonSearchValue[]): void {
    this.tradesSearchFacade.updateInstrumentTypes(this.toStrings(selected));
  }
  selectTraderSuggestion(selected: CommonSearchValue[]): void {
    this.tradesSearchFacade.updateTraders(this.toStrings(selected));
  }

  // ── Clear handlers ────────────────────────────────────────────────────────
  removeSymbol(): void    { this.tradesSearchFacade.updateCusip([]); }
  removeFunds(): void     { this.tradesSearchFacade.updateFunds([]); }
  removeBrokers(): void   { this.tradesSearchFacade.updateBrokers([]); }
  removeIvTypes(): void   { this.tradesSearchFacade.updateInstrumentTypes([]); }
  removeTraders(): void   { this.tradesSearchFacade.updateTraders([]); }

  // ── Date / search / reset ─────────────────────────────────────────────────
  onDateRangeEventTriggered(ev: DateRangeEvent): void {
    this.tradesSearchFacade.updateDatePickingMethod(ev.dateSelectionType);
    this.tradesSearchFacade.updateStartDate(ev.dateRange.startDate);
    this.tradesSearchFacade.updateEndDate(ev.dateRange.endDate);
  }

  onCancelledCheckboxClick(event: { checked: boolean }): void {
    this.tradesSearchFacade.updateAreCancelledTradesEnabled(event.checked);
  }

  setDateError(error: string): void {
    this.dateError.set(error);
  }

  areThereErrors(): boolean {
    return this.formGroup.invalid || this.dateError() !== '';
  }

  getTradingData(event: MouseEvent): void {
    this.tradesSearchFacade.updateInteractionType(
      getInteractionTypeFromEvent(event),
    );
    if (!this.areThereErrors()) this.tradesSearchFacade.searchData();
  }

  clearAll(): void {
    this.tradesSearchFacade.clearTrades();
    this.datePicker()?.clearDatePicker();
    this.clearSignal.set({});
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private toStrings(values: CommonSearchValue[]): string[] {
    return values.map((v) => `${v}`);
  }

  private toNumbers(values: CommonSearchValue[]): number[] {
    return values.map(Number).filter(Number.isFinite);
  }
}
