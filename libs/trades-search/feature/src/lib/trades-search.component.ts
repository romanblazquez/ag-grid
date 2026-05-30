import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import {
  AbstractData,
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
import { IprefsService } from '@trade-platform/shared/data-access';

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
export class TradesSearchComponent implements OnInit {
  private readonly tradesSearchFacade = inject(TradesSearchFacadeService);
  private readonly legacyFacade = inject(LegacyDataAccessFacadeService);
  private readonly iprefs = inject(IprefsService);

  readonly formGroup = new FormGroup({});

  // ── Search contexts ───────────────────────────────────────────────────────
  // Option 1 wired here: `initialDataFn` returns the iprefs for this type
  // via the signals-based IprefsService (persists to localStorage).
  // The HDS facade short-circuits to this callback, bypassing the legacy
  // preference store entirely.

  readonly symbolSearchContext: SearchContext = {
    searchType: SearchType.Symbol,
    initialDataFn: () => this.iprefs.get$<AbstractData>(SearchType.Symbol),
  };

  readonly brokerSearchContext: SearchContext = {
    searchType: SearchType.Broker,
    initialDataFn: () => this.iprefs.get$<TreeNode>(SearchType.Broker),
  };

  readonly traderSearchContext: SearchContext = {
    searchType: SearchType.Trader,
    initialDataFn: () => this.iprefs.get$<AbstractData>(SearchType.Trader),
  };

  readonly instrumentTypeSearchContext: SearchContext = {
    searchType: SearchType.InstrumentType,
    initialDataFn: () => this.iprefs.get$<TreeNode>(SearchType.InstrumentType),
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
      : {
          searchType: SearchType.FundPm,
          initialDataFn: () => this.iprefs.get$<AbstractData>(SearchType.FundPm),
        },
  );

  /**
   * Option 2 wired here: also seed the legacy preference store at bootstrap.
   * Belt-and-suspenders: if any future SearchContext drops `initialDataFn`,
   * the HDS facade falls back through the legacy chain and finds these.
   * For real iprefs, the IprefsService persists across reloads automatically.
   */
  ngOnInit(): void {
    for (const type of [
      SearchType.Symbol,
      SearchType.FundPm,
      SearchType.Broker,
      SearchType.Trader,
    ]) {
      const saved = this.iprefs.get(type);
      if (saved.length > 0) {
        this.legacyFacade.setPreference({ searchType: type }, saved, false);
      }
    }
  }

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
