import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { AbstractData } from '../../model/search-result.model';
import { SearchService } from './search.service';
import { bestMatchSortFn } from '../../util/sorting-util';
import { DataAccessFacadeService } from '../data-access-facade.service';

export const PORTFOLIO_SERVICE_URL = new InjectionToken<string>(
  'PORTFOLIO_SERVICE_URL',
);

export interface FundData {
  shortName: string;
  fundNumber: string;
  fullName: string;
  [key: string]: unknown;
}

interface FundResponse {
  funds?: FundData[];
  docs?: FundData[];
}

@Injectable()
export class PortfolioService extends SearchService<FundData> {
  private readonly http = inject(HttpClient);
  private readonly url = inject(PORTFOLIO_SERVICE_URL, { optional: true });
  private readonly dataCache = inject(DataAccessFacadeService);

  search(query: string): Observable<FundData[]> {
    if (!this.url) return of([]);
    let queryStr = query.trim() ? `${encodeURIComponent(query.trim())}*` : '*';
    if (query.includes(',')) {
      queryStr = query
        .replace(/\s/g, '')
        .split(',')
        .map((t) => encodeURIComponent(t))
        .join(' ');
    }
    return this.http
      .get<FundResponse>(`${this.url}?q=${queryStr}`)
      .pipe(
        map((res) =>
          (res.docs ?? res.funds ?? []).sort(
            bestMatchSortFn(query, (f) => f.shortName),
          ),
        ),
      );
  }

  loadInitialData(): Observable<unknown> {
    return of([]);
  }

  getInitialData(): Observable<FundData[]> {
    const cachedValues = this.dataCache.getPreference<unknown>('fundPm');
    if (!cachedValues.length) {
      return this.search('');
    }

    return this.search('').pipe(
      map((rows) =>
        this.dataCache.getPreference<FundData>('fundPm', rows, 'fundNumber'),
      ),
    );
  }

  toDataSourceFn() {
    return (query: string): Observable<AbstractData[]> =>
      query ? this.search(query) : this.getInitialData();
  }
}
