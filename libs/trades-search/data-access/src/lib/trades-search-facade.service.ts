import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import {
  ExecutionSearchRequest,
  GridView,
  TradeSearchRequest,
  gridViewQParams,
} from './model/search-request.model';
import {
  allStatusesExecutions,
  allStatusesTrades,
  defaultStatusesExecutions,
  defaultStatusesTrades,
} from './model/constants';
import { InteractionType } from './model/interaction-type.enum';
import {
  DateSelectionType,
} from '@trade-platform/shared/ui/date-picker';

export type AnyTradeRequest = TradeSearchRequest | ExecutionSearchRequest;

export interface TradesSearchResult {
  request: AnyTradeRequest;
  view: GridView;
}

/**
 * Signals-based facade for the trades-search filters. Drop-in replacement for
 * the NgRx store + facade pair from the original Fidelity workspace: same
 * surface (observables become signals, mutators become methods), zero NgRx
 * dependency. The downstream grid consumes `searches$` to receive each
 * dispatched search payload.
 */
@Injectable({ providedIn: 'root' })
export class TradesSearchFacadeService {
  // ── Filter state ─────────────────────────────────────────────────────
  private readonly _symbol = signal<string>('');
  private readonly _fmrCusips = signal<string[]>([]);
  private readonly _funds = signal<string[]>([]);
  private readonly _brokers = signal<number[]>([]);
  private readonly _ivtypes = signal<string[]>([]);
  private readonly _traders = signal<string[]>([]);
  private readonly _startDate = signal<Date>(new Date());
  private readonly _endDate = signal<Date>(new Date());
  private readonly _datePickingMethod = signal<DateSelectionType>(
    DateSelectionType.Custom,
  );
  private readonly _interactionType = signal<InteractionType | undefined>(
    undefined,
  );
  private readonly _areCancelledTradesEnabled = signal<boolean>(false);
  private readonly _desk = signal<string[]>(['FMREQ', 'FMRHI', 'FMRCY']);

  // ── Public read-only signals ─────────────────────────────────────────
  readonly symbol = this._symbol.asReadonly();
  readonly fmrCusips = this._fmrCusips.asReadonly();
  readonly funds = this._funds.asReadonly();
  readonly brokers = this._brokers.asReadonly();
  readonly ivtypes = this._ivtypes.asReadonly();
  readonly traders = this._traders.asReadonly();
  readonly startDate = this._startDate.asReadonly();
  readonly endDate = this._endDate.asReadonly();
  readonly datePickingMethod = this._datePickingMethod.asReadonly();
  readonly interactionType = this._interactionType.asReadonly();
  readonly areCancelledTradesEnabled =
    this._areCancelledTradesEnabled.asReadonly();
  readonly desk = this._desk.asReadonly();

  readonly hasAnyFilter = computed(
    () =>
      this._fmrCusips().length > 0 ||
      this._funds().length > 0 ||
      this._ivtypes().length > 0 ||
      this._brokers().length > 0 ||
      this._traders().length > 0,
  );

  isExecutionsContext = false;

  // ── Search emission stream ───────────────────────────────────────────
  private readonly _searches = new Subject<TradesSearchResult>();
  readonly searches$ = this._searches.asObservable();

  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly datePipe = new DatePipe('en-US');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (this.route) {
      this.route.queryParams
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => {
          this.isExecutionsContext =
            params[gridViewQParams] === GridView.Executions;
        });
    }
  }

  // ── Mutators ─────────────────────────────────────────────────────────
  updateSymbol(symbol: string): void {
    this._symbol.set(symbol);
  }
  updateCusip(cusips: string[]): void {
    this._fmrCusips.set(cusips);
  }
  updateFunds(funds: string[]): void {
    this._funds.set(funds);
  }
  updateBrokers(brokers: number[]): void {
    this._brokers.set(brokers);
  }
  updateInstrumentTypes(types: string[]): void {
    this._ivtypes.set(types);
  }
  updateTraders(traders: string[]): void {
    this._traders.set(traders);
  }
  updateStartDate(d: Date): void {
    this._startDate.set(d);
  }
  updateEndDate(d: Date): void {
    this._endDate.set(d);
  }
  updateDatePickingMethod(method: DateSelectionType): void {
    this._datePickingMethod.set(method);
  }
  updateInteractionType(type: InteractionType): void {
    this._interactionType.set(type);
  }
  updateAreCancelledTradesEnabled(enabled: boolean): void {
    this._areCancelledTradesEnabled.set(enabled);
  }

  // ── Search/clear ─────────────────────────────────────────────────────
  searchData(): void {
    const request = this.isExecutionsContext
      ? this.getExecutionsRequestPayload()
      : this.getTradesRequestPayload();
    this._searches.next({
      request,
      view: this.isExecutionsContext ? GridView.Executions : GridView.Trades,
    });
  }

  clearTrades(): void {
    this._fmrCusips.set([]);
    this._funds.set([]);
    this._brokers.set([]);
    this._ivtypes.set([]);
    this._traders.set([]);
    this._symbol.set('');
    this._areCancelledTradesEnabled.set(false);
    this._datePickingMethod.set(DateSelectionType.Custom);
  }

  // ── Payload builders ─────────────────────────────────────────────────
  getTradesRequestPayload(): TradeSearchRequest {
    return {
      fmrIssueCusips: this._fmrCusips(),
      startDate: this.fmt(this._startDate()),
      endDate: this.fmt(this._endDate()),
      parentTradingDeskShortNames: this._desk(),
      ivTypeCodes: this._ivtypes(),
      statuses: this.getStatuses(),
      fmrFundNumbers: this._funds(),
      brokerFirmSourceIds: this._brokers(),
      fmrSymbols: [],
      traderPersonSourceIds: this._traders(),
    };
  }

  getExecutionsRequestPayload(): ExecutionSearchRequest {
    return {
      fmrIssueCusips: this._fmrCusips(),
      startDate: this.fmt(this._startDate()),
      endDate: this.fmt(this._endDate()),
      parentTradingDeskShortNames: this._desk(),
      ivTypeCodes: this._ivtypes(),
      statuses: this.getStatuses(),
      brokerFirmSourceIds: this._brokers(),
      fmrSymbols: [],
      traderPersonSourceIds: this._traders(),
    };
  }

  private getStatuses(): string[] {
    if (this._areCancelledTradesEnabled()) {
      return this.isExecutionsContext
        ? allStatusesExecutions
        : allStatusesTrades;
    }
    return this.isExecutionsContext
      ? defaultStatusesExecutions
      : defaultStatusesTrades;
  }

  private fmt(d: Date | undefined): string {
    return this.datePipe.transform(d, 'yyyy-MM-dd') ?? '';
  }
}
