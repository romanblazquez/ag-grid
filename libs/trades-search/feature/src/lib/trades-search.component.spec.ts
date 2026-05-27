import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  DataAccessFacadeService,
  SearchType,
} from '@trade-platform/shared/ui/hds-common-search';
import { TradesSearchComponent } from './trades-search.component';
import { TradesSearchFacadeService } from '@trade-platform/exac/trades-search/data-access';

describe('TradesSearchComponent', () => {
  let component: TradesSearchComponent;
  let searchFacade: TradesSearchFacadeService;
  let preferenceCache: DataAccessFacadeService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TradesSearchComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    component = TestBed.createComponent(TradesSearchComponent).componentInstance;
    searchFacade = TestBed.inject(TradesSearchFacadeService);
    preferenceCache = TestBed.inject(DataAccessFacadeService);
  });

  it('wires all search inputs through the shared search contexts', () => {
    expect(component.symbolSearchContext.searchType).toBe(SearchType.Symbol);
    expect(component.brokerSearchContext.searchType).toBe(SearchType.Broker);
    expect(component.traderSearchContext.searchType).toBe(SearchType.Trader);
    expect(component.instrumentTypeSearchContext.searchType).toBe(
      SearchType.InstrumentType,
    );
    expect(component.fundSearchContext()?.searchType).toBe(SearchType.FundPm);
  });

  it('commits pending preferences on search submit', () => {
    const commitSpy = jest.spyOn(preferenceCache, 'commitPreferences');
    const searchSpy = jest.spyOn(searchFacade, 'searchData');

    component.getTradingData(new MouseEvent('click'));

    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  it('clears pending preferences on reset without touching the committed cache', () => {
    const clearSpy = jest.spyOn(preferenceCache, 'clearPendingPreferences');

    component.clearAll();

    expect(clearSpy).toHaveBeenCalledWith([
      'symbol',
      'fundPm',
      'broker',
      'instrumentType',
      'trader',
    ]);
  });
});
