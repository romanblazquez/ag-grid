import { DataAccessFacadeService } from './data-access-facade.service';
import { SearchContext } from '../model/search-context.model';

describe('DataAccessFacadeService', () => {
  const storageKey = 'trade-platform.common-search.iprefs';

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps pending selections out of committed session storage until commit', () => {
    const service = new DataAccessFacadeService();

    service.setPreference(
      { searchType: 'broker' } as SearchContext,
      [{ firmCode: 'GS' }],
      false,
    );

    expect(service.getPreference('broker')).toEqual([]);
    expect(sessionStorage.getItem(storageKey)).toBeNull();

    service.commitPreferences();

    expect(service.getPreference('broker')).toEqual([{ firmCode: 'GS' }]);
    expect(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')).toEqual({
      broker: [{ firmCode: 'GS' }],
    });
  });

  it('hydrates committed preferences from session storage', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        symbol: [{ symbol: 'AAPL', cusip: '037833100' }],
      }),
    );

    const service = new DataAccessFacadeService();

    expect(service.getPreference('symbol')).toEqual([
      { symbol: 'AAPL', cusip: '037833100' },
    ]);
  });

  it('maps committed preference values back to rows from the supplied pool', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        broker: [1001],
      }),
    );

    const service = new DataAccessFacadeService();
    const rows = [
      { firmSourceId: 1001, firmCode: 'GS' },
      { firmSourceId: 1002, firmCode: 'MS' },
    ];

    expect(
      service.getPreference<typeof rows[number]>('broker', rows, 'firmSourceId'),
    ).toEqual([{ firmSourceId: 1001, firmCode: 'GS' }]);
  });

  it('clears only pending preferences when asked', () => {
    const service = new DataAccessFacadeService();

    service.setPreference(
      { searchType: 'trader' } as SearchContext,
      [{ personSourceId: 'P001' }],
      false,
    );
    service.clearPendingPreferences(['trader']);
    service.commitPreferences();

    expect(service.getPreference('trader')).toEqual([]);
    expect(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')).toEqual({
      trader: [],
    });
  });
});
