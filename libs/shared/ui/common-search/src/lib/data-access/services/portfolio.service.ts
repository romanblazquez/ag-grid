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
import { TreeNode } from '../../model/tree-result.model';

interface MockPortfolioResponse {
  docs?: AbstractData[];
}

@Injectable()
export class PortfolioService extends SearchService<any> {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;

  public constructor(
    private readonly httpClient: HttpClient,
    private readonly preferenceService: PreferenceService,
  ) {
    super();
  }

  public search(query: string, serviceContext: Context): Observable<any[]> {
    return this.apiRecord.GetPortfolio.url.pipe(
      mergeMap((baseUrl) => {
        // Append trailing * for prefix matching (the mock server strips it)
        let queryStr = `${query}*`;
        if (query.includes(',')) {
          queryStr = query.replace(/\s/g, '').replace(/,/g, ' ');
        }
        const url = baseUrl.replace(/{query}/g, encodeURIComponent(queryStr));
        return this.httpClient.get<MockPortfolioResponse>(url);
      }),
      map((res) => (res.docs ?? []).map((d) => this.normalize(d))),
    );
  }

  /** Map mock-server fields to registry's expected names. */
  private normalize(d: AbstractData): AbstractData {
    return {
      ...d,
      longName: (d['longName'] ?? d['fullName']) as string,
    };
  }

  public getInitialData(serviceContext: Context): Observable<any> {
    return this.preferenceService.getPreference<TreeNode[]>(
      serviceContext.emitField,
      serviceContext.preferenceContext,
    );
  }

  public loadInitialData(): Observable<any[]> {
    throw new Error('Method not implemented.');
  }
}
