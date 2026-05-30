import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, mergeMap, Observable, tap } from 'rxjs';
import { Broker, BrokerDealerResponse } from '../../model/broker-dealer-response.interface';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';
import { PreferenceService } from './preference.service';
import { bestMatchSortFn } from '../../util/sorting-util';
import { TreeNode } from '../../model/tree-result.model';
import { transformBrokersToTreeNodes } from '../../util/transformation-util';
import { ApiName, ServiceConfig } from '../../model/service-config.model';
import { svcConfig } from '../../model/external-services.constant';

@Injectable()
export class BrokersService extends SearchService<any> {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;
  public override persistedData$: BehaviorSubject<Broker[]> =
    new BehaviorSubject<Broker[]>([]);

  public constructor(
    private readonly http: HttpClient,
    private readonly preferenceService: PreferenceService,
  ) {
    super();
  }

  public search(
    query: string,
    serviceContext: Context,
  ): Observable<TreeNode[]> {
    const dataPool: Observable<Broker[]> = this.persistedData$.value.length
      ? this.persistedData$.asObservable()
      : this.getAllBrokers();

    const filterMethod = serviceContext.multiselect
      ? this.filterByQueryMultiselect
      : this.filterByQuerySingleSelect;

    return dataPool.pipe(
      map((brokers: Broker[]) => {
        const filteredBrokers = filterMethod(brokers, query, [
          (broker) => broker.shortName ?? '',
          (broker) => broker.longName ?? '',
        ]).sort(bestMatchSortFn(query, (broker) => broker.shortName ?? ''));

        return transformBrokersToTreeNodes(filteredBrokers, serviceContext);
      }),
    );
  }

  public loadInitialData(): Observable<any> {
    return this.getAllBrokers().pipe(
      tap((brokers) => this.persistedData$.next(brokers)),
    );
  }

  public getAllBrokers(): Observable<Broker[]> {
    return this.apiRecord.GetBrokers.url.pipe(
      mergeMap((url) =>
        this.http.get<BrokerDealerResponse>(url).pipe(
          map((response) => {
            const raw: Broker[] = response.dealers ?? response.dealer ?? [];
            // Normalise mock-server fields to the shortName/longName convention
            return raw.map((b) => ({
              ...b,
              shortName: b.shortName ?? b.firmCode ?? '',
              longName: b.longName ?? b.firmName ?? '',
              idSrc: b.idSrc ?? String(b.firmSourceId ?? ''),
            }));
          }),
        ),
      ),
    );
  }

  public override getInitialData(
    serviceContext: Context,
  ): Observable<TreeNode[]> {
    return this.preferenceService
      .getPreference<any>(
        serviceContext.emitField,
        serviceContext.preferenceContext,
      )
      .pipe(
        map((items) => {
          const existingTreeNodes: TreeNode[] = [];
          const idSrcStrings: string[] = [];

          items.forEach((item) => {
            if (typeof item === 'string') {
              idSrcStrings.push(item);
            } else {
              existingTreeNodes.push(item as TreeNode);
            }
          });

          const brokers = this.persistedData$.value;
          const treeNodesFromStrings = this.transformStringToTreeNode(
            idSrcStrings,
            brokers,
            serviceContext,
          );

          return [...existingTreeNodes, ...treeNodesFromStrings];
        }),
      );
  }

  private transformStringToTreeNode(
    idSrcStrings: string[],
    brokers: Broker[],
    serviceContext: Context,
  ): TreeNode[] {
    const brokersFromStrings: Broker[] = idSrcStrings
      .map((idSrc) => brokers.find((b) => b.idSrc === idSrc))
      .filter((broker): broker is Broker => broker !== undefined);

    return transformBrokersToTreeNodes(brokersFromStrings, serviceContext);
  }
}
