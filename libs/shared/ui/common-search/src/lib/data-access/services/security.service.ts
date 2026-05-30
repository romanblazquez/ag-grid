import { Injectable } from '@angular/core';
import { ApiName, ServiceConfig } from '../../model/service-config.model';
import { Context } from '../../model/context.model';
import { svcConfig } from '../../model/external-services.constant';
import { mergeMap, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AbstractData } from '../../model/solr-response.model';
import { SearchService } from './search.service';
import { PreferenceService } from './preference.service';

@Injectable()
export class SecurityService extends SearchService<any> {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;

  public constructor(
    private readonly httpClient: HttpClient,
    private readonly preferenceService: PreferenceService,
  ) {
    super();
  }

  public search(query: string, serviceContext: Context): Observable<any[]> {
    return this.apiRecord.GetSecurities.url.pipe(
      mergeMap((baseUrl) => {
        const url = baseUrl.replace(/{query}/g, encodeURIComponent(query));
        return this.httpClient.get<{ docs?: AbstractData[] }>(url);
      }),
      map((res) => (res.docs ?? []).map((d) => this.normalize(d))),
    );
  }

  /** Map mock-server fields to the registry's expected field names. */
  private normalize(d: AbstractData): AbstractData {
    return {
      ...d,
      ticker: (d['ticker'] ?? d['symbol']) as string,
      issueCUSIP: (d['issueCUSIP'] ?? d['cusip']) as string,
      bloombergId2: (d['bloombergId2'] ?? d['symbol']) as string,
      longName: (d['longName'] ?? d['description']) as string,
    };
  }

  public override getInitialData(serviceContext: Context): Observable<any[]> {
    return this.preferenceService.getPreference<any>(
      serviceContext.emitField,
      serviceContext.preferenceContext,
    );
  }

  public loadInitialData(): Observable<any[]> {
    throw new Error('Method not implemented.');
  }
}
