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
  BrokerService,
  CodeValueService,
  DataAccessFacadeService,
  CommonSearchValue,
  HdsCommonSearchComponent,
  PersonSearchService,
  PortfolioService,
  SearchContext,
  SearchType,
  SecurityService,
  TreeNode,
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
  // Services are provided here so each TradesSearchComponent instance gets its
  // own cache (BehaviorSubject in SearchService). Root-provided services would
  // share state across unrelated search panels.
  providers: [
    SecurityService,
    BrokerService,
    PersonSearchService,
    PortfolioService,
    CodeValueService,
  ],
})
export class TradesSearchComponent {
  private readonly tradesSearchFacade = inject(TradesSearchFacadeService);
  private readonly searchPreferenceCache = inject(DataAccessFacadeService);
  private readonly searchPreferenceKeys = [
    'symbol',
    'fundPm',
    'broker',
    'instrumentType',
    'trader',
  ];

  // ── Search services (real HTTP layer) ─────────────────────────────────────
  private readonly securityService = inject(SecurityService);
  private readonly brokerService = inject(BrokerService);
  private readonly personService = inject(PersonSearchService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly codeValueService = inject(CodeValueService);

  readonly formGroup = new FormGroup({});

  // ── Search contexts ────────────────────────────────────────────────────────
  // Each context binds a searchType (for registry config: placeholder, fields,
  // widths) plus dataSourceFn/initialDataFn (real HTTP via the injected service).
  // This mirrors the POC pattern: the component owns the wiring; the component
  // template stays unaware of services.

  readonly symbolSearchContext: SearchContext = {
    searchType: SearchType.Symbol,
    dataSourceFn: (q) => this.securityService.search(q),
    initialDataFn: () => this.securityService.getInitialData(),
  };

  readonly brokerSearchContext: SearchContext = {
    searchType: SearchType.Broker,
    dataSourceFn: (q) => this.brokerService.search(q),
    initialDataFn: () => this.brokerService.getInitialData(),
  };

  readonly traderSearchContext: SearchContext = {
    searchType: SearchType.Trader,
    dataSourceFn: (q) => this.personService.search(q),
    initialDataFn: () => this.personService.getInitialData(),
  };

  readonly instrumentTypeSearchContext: SearchContext = {
    searchType: SearchType.InstrumentType,
    dataSourceFn: (q) => this.codeValueService.search(q),
    initialDataFn: () => this.codeValueService.getInitialData(),
    disableRules: {
      tree: (node: TreeNode | { items: { name: string; value: unknown }[] }) => {
        const items = (node as TreeNode).items;
        const code = (items?.[1]?.value ?? items?.[0]?.value) as string;
        return typeof code === 'string' && code.toUpperCase() === 'CS';
      },
    },
  };

  readonly fundSearchContext = computed<SearchContext | null>(() =>
    this.tradesSearchFacade.isExecutionsContext()
      ? null
      : {
          searchType: SearchType.FundPm,
          dataSourceFn: (q) => this.portfolioService.search(q),
          initialDataFn: () => this.portfolioService.getInitialData(),
        },
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
    if (this.areThereErrors()) return;
    this.searchPreferenceCache.commitPreferences();
    this.tradesSearchFacade.searchData();
  }

  clearAll(): void {
    this.tradesSearchFacade.clearTrades();
    this.datePicker()?.clearDatePicker();
    this.clearSignal.set({});
    this.searchPreferenceCache.clearPendingPreferences(
      this.searchPreferenceKeys,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private toStrings(values: CommonSearchValue[]): string[] {
    return values.map((v) => `${v}`);
  }

  private toNumbers(values: CommonSearchValue[]): number[] {
    return values.map(Number).filter(Number.isFinite);
  }
}
