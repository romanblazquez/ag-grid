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
  CommonSearchValue,
  HdsCommonSearchComponent,
  SearchContext,
  SearchType,
  TreeNode,
} from '@trade-platform/shared/ui/common-search';
import {
  DatePickerComponent,
  DateRangeEvent,
} from '@trade-platform/shared/ui/date-picker';
import {
  TradesSearchFacadeService,
  getInteractionTypeFromEvent,
} from '@trade-platform/trades-search/data-access';

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
      : { searchType: SearchType.FundPm },
  );

  readonly dateError = signal('');
  readonly clearSignal = signal<object | undefined>(undefined);
  readonly includeCancelled =
    this.tradesSearchFacade.areCancelledTradesEnabled;

  readonly isSearchActive = computed(() => this.tradesSearchFacade.hasAnyFilter());

  readonly datePicker = viewChild<DatePickerComponent>('datePicker');

  // ── User actions ─────────────────────────────────────────────────────
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

  removeSymbol(): void {
    this.tradesSearchFacade.updateCusip([]);
  }
  removeFunds(): void {
    this.tradesSearchFacade.updateFunds([]);
  }
  removeBrokers(): void {
    this.tradesSearchFacade.updateBrokers([]);
  }
  removeIvTypes(): void {
    this.tradesSearchFacade.updateInstrumentTypes([]);
  }
  removeTraders(): void {
    this.tradesSearchFacade.updateTraders([]);
  }

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
    // New reference each clear so child `effect` re-fires.
    this.clearSignal.set({});
  }

  private toStrings(values: CommonSearchValue[]): string[] {
    return values.map((value) => `${value}`);
  }

  private toNumbers(values: CommonSearchValue[]): number[] {
    return values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }
}
