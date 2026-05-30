/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 6/20/23, 4:51 PM
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, of } from 'rxjs';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';
import { PreferenceService } from './preference.service';
import { bestMatchSortFn } from '../../util/sorting-util';

/** Local stub replacing IOIBrokerInfo from @fmr-pr000539/shared/data */
export interface IOIBrokerInfo {
  shortName: string;
  longName: string;
  cashDesk?: string;
  [key: string]: unknown;
}

@Injectable()
export class ParentBrokerSearchService extends SearchService<IOIBrokerInfo> {
  private readonly _parentBrokers$ = new BehaviorSubject<IOIBrokerInfo[]>([]);

  public constructor(
    private readonly preferenceService: PreferenceService,
  ) {
    super();
  }

  public search(
    query: string,
    serviceContext?: Context,
  ): Observable<IOIBrokerInfo[]> {
    return this._parentBrokers$.pipe(
      map((brokers) =>
        brokers
          .filter(
            (broker: IOIBrokerInfo) =>
              broker.shortName.toLowerCase().includes(query.toLowerCase()) ||
              broker.longName.toLowerCase().includes(query.toLowerCase()),
          )
          .sort(bestMatchSortFn(query, (broker) => broker.shortName)),
      ),
    );
  }

  public override getInitialData(
    serviceContext: Context,
  ): Observable<IOIBrokerInfo[]> {
    return this.preferenceService.getPreference<IOIBrokerInfo>(
      serviceContext.emitField,
      serviceContext.preferenceContext,
      this.persistedData$,
    );
  }

  public loadInitialData(): Observable<any> {
    // Stub: no-op - parent brokers would be loaded via HTTP in real implementation
    return of([]);
  }
}
