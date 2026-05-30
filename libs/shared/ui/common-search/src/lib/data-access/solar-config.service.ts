import { Injectable } from '@angular/core';
import { ApiName, ServiceConfig } from '../model/service-config.model';
import { SearchType } from '../model/search-type.model';
import { Context } from '../model/context.model';
import {
  externalServices,
  svcConfig,
} from '../model/external-services.constant';

@Injectable()
export class SolarConfigService {
  public serviceRecord: Record<SearchType, Context> = externalServices;
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;

  public constructor() {
    // No-op: Solr URL configuration handled via svcConfig defaults
  }

  public getServiceContext(searchtype: SearchType): Context {
    return this.serviceRecord[searchtype];
  }

  public getApiInfo(apiName: ApiName): ServiceConfig {
    return this.apiRecord[apiName];
  }
}
