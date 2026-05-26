import { Injectable, InjectionToken, Inject, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AllocationModel,
  ExecutionModel,
  TradeModel,
} from '@trade-platform/exac/shared/data';
import {
  ExecutionSearchRequest,
  TradeSearchRequest,
} from '@trade-platform/exac/trades-grid/data';

/** InjectionToken for the trade activity service base URL. */
export const TRADE_ACTIVITY_SERVICE_URL = new InjectionToken<string>(
  'TRADE_ACTIVITY_SERVICE_URL',
  { factory: () => '' },
);

function generateTransactionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

@Injectable({ providedIn: 'root' })
export class TradeActivityService {
  private readonly http = inject(HttpClient);

  public constructor(
    @Inject(TRADE_ACTIVITY_SERVICE_URL) private readonly serviceUrl: string,
  ) {}

  public getTrades(request: TradeSearchRequest): Observable<TradeModel[]> {
    const headers = new HttpHeaders().set('X-REQUEST-STATS-TRANSID', generateTransactionId());
    return this.http.post<TradeModel[]>(`${this.serviceUrl}trades`, request, { headers });
  }

  public getExecutions(request?: ExecutionSearchRequest): Observable<ExecutionModel[]> {
    const headers = new HttpHeaders().set('X-REQUEST-STATS-TRANSID', generateTransactionId());
    return this.http.post<ExecutionModel[]>(`${this.serviceUrl}executions`, request ?? {}, { headers });
  }

  public getAllocationsByExecutionId(executionId: string): Observable<AllocationModel[]> {
    const headers = new HttpHeaders().set('X-REQUEST-STATS-TRANSID', generateTransactionId());
    return this.http
      .get<AllocationModel[] | null>(`${this.serviceUrl}allocations?executionId=${executionId}`, { headers })
      .pipe(map((response) => response ?? []));
  }
}
