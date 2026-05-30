import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import { AbstractData, DataAccessFacadeService } from '@trade-platform/shared/ui/hds-common-search';
import { SearchService } from './search.service';
import { bestMatchSortFn } from '../../util/sorting-util';

export const BROKER_SERVICE_URL = new InjectionToken<string>(
  'BROKER_SERVICE_URL',
);

export interface BrokerData {
  firmSourceId: number;
  firmName: string;
  firmCode: string;
  [key: string]: unknown;
}

interface BrokerDealerResponse {
  dealers: BrokerData[];
}

@Injectable()
export class BrokerService extends SearchService<BrokerData> {
  override persistedData$: BehaviorSubject<BrokerData[]> = new BehaviorSubject<
    BrokerData[]
  >([]);

  private readonly http = inject(HttpClient);
  private readonly url = inject(BROKER_SERVICE_URL, { optional: true });
  private readonly dataCache = inject(DataAccessFacadeService);

  search(query: string): Observable<BrokerData[]> {
    return this.getAllBrokers().pipe(
      map((brokers) =>
        this.filterByQueryMultiselect(brokers, query, [
          (b) => b.firmCode,
          (b) => b.firmName,
        ]).sort(bestMatchSortFn(query, (b) => b.firmCode)),
      ),
    );
  }

  loadInitialData(): Observable<BrokerData[]> {
    return this.getAllBrokers().pipe(
      tap((brokers) => this.persistedData$.next(brokers)),
    );
  }

  getInitialData(): Observable<BrokerData[]> {
    const cachedValues = this.dataCache.getPreference<unknown>('broker');
    if (!cachedValues.length) {
      return this.search('');
    }

    const persisted = this.persistedData$.value;
    if (persisted.length > 0) {
      return of(
        this.dataCache.getPreference<BrokerData>(
          'broker',
          persisted,
          'firmSourceId',
        ),
      );
    }

    return this.loadInitialData().pipe(
      map(() =>
        this.dataCache.getPreference<BrokerData>(
          'broker',
          this.persistedData$.value,
          'firmSourceId',
        ),
      ),
    );
  }

  getAllBrokers(): Observable<BrokerData[]> {
    if (!this.url) return of([]);
    return this.http
      .get<BrokerDealerResponse>(
        `${this.url}?firm-activity=CRAAL2A&firm-status-code=ACTIVE`,
      )
      .pipe(map((res) => res.dealers ?? []));
  }

  toDataSourceFn() {
    return (query: string): Observable<AbstractData[]> =>
      query ? this.search(query) : this.getInitialData();
  }
}
