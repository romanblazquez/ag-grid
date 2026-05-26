import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { AbstractData } from '../../model/search-result.model';
import { SearchService } from './search.service';
import { bestMatchSortFn } from '../../util/sorting-util';
import { DataAccessFacadeService } from '../data-access-facade.service';

export const SECURITY_SERVICE_URL = new InjectionToken<string>(
  'SECURITY_SERVICE_URL',
);

export interface SecurityData {
  symbol: string;
  cusip: string;
  description: string;
  [key: string]: unknown;
}

interface SecurityResponse {
  docs: SecurityData[];
}

@Injectable()
export class SecurityService extends SearchService<SecurityData> {
  private readonly http = inject(HttpClient);
  private readonly url = inject(SECURITY_SERVICE_URL, { optional: true });
  private readonly dataCache = inject(DataAccessFacadeService);

  search(query: string): Observable<SecurityData[]> {
    if (!this.url) return of([]);
    const encoded = encodeURIComponent(query.trim());
    return this.http
      .get<SecurityResponse>(`${this.url}?q=${encoded}`)
      .pipe(
        map((res) =>
          (res.docs ?? []).sort(
            bestMatchSortFn(query, (s) => s.symbol),
          ),
        ),
      );
  }

  loadInitialData(): Observable<unknown> {
    return of([]);
  }

  getInitialData(): Observable<SecurityData[]> {
    const cachedValues = this.dataCache.getPreference<unknown>('symbol');
    if (!cachedValues.length) {
      return this.search('');
    }

    return this.search('').pipe(
      map((rows) =>
        this.dataCache.getPreference<SecurityData>('symbol', rows, 'cusip'),
      ),
    );
  }

  toDataSourceFn() {
    return (query: string): Observable<AbstractData[]> =>
      query ? this.search(query) : this.getInitialData();
  }

  private fetchWithQuery(
    baseUrl: string,
    query: string,
  ): Observable<SecurityData[]> {
    const fields = ['ticker', 'issueCUSIP', 'longName'];
    const terms = query.replace(/\s/g, '').split(',');
    const parts: string[] = [];
    fields.forEach((field) => {
      terms.forEach((term) => {
        const txt = term.startsWith('*') ? `\\${term}` : term;
        parts.push(`(${field}:${encodeURIComponent(txt)})`);
      });
    });
    const queryUrl = `${baseUrl}?q=${parts.join('+OR+')}`;
    return this.http
      .get<SecurityResponse>(queryUrl)
      .pipe(map((res) => res.docs ?? []));
  }
}
