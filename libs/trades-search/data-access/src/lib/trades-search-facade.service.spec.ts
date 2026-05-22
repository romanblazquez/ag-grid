import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs';
import { DateSelectionType } from '@trade-platform/shared/ui/date-picker';
import { GridView, TradeSearchRequest } from './model/search-request.model';
import { TradesSearchFacadeService } from './trades-search-facade.service';

describe('TradesSearchFacadeService', () => {
  let service: TradesSearchFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TradesSearchFacadeService);
  });

  it('emits a trades search payload with selected filters', (done) => {
    service.updateCusip(['037833100']);
    service.updateFunds(['00022']);
    service.updateBrokers([1001]);
    service.updateInstrumentTypes(['EQ']);
    service.updateTraders(['P001']);

    service.searches$.pipe(take(1)).subscribe((result) => {
      expect(result.view).toBe(GridView.Trades);
      const request = result.request as TradeSearchRequest;
      expect(request.fmrIssueCusips).toEqual(['037833100']);
      expect(request.fmrFundNumbers).toEqual(['00022']);
      expect(request.brokerFirmSourceIds).toEqual([1001]);
      expect(request.ivTypeCodes).toEqual(['EQ']);
      expect(request.traderPersonSourceIds).toEqual(['P001']);
      done();
    });

    service.searchData();
  });

  it('clears filters, cancelled state, and date picking method', () => {
    service.updateCusip(['037833100']);
    service.updateFunds(['00022']);
    service.updateBrokers([1001]);
    service.updateInstrumentTypes(['EQ']);
    service.updateTraders(['P001']);
    service.updateAreCancelledTradesEnabled(true);
    service.updateDatePickingMethod(DateSelectionType.Last7Days);

    service.clearTrades();

    expect(service.fmrCusips()).toEqual([]);
    expect(service.funds()).toEqual([]);
    expect(service.brokers()).toEqual([]);
    expect(service.ivtypes()).toEqual([]);
    expect(service.traders()).toEqual([]);
    expect(service.areCancelledTradesEnabled()).toBe(false);
    expect(service.datePickingMethod()).toBe(DateSelectionType.Custom);
  });
});
