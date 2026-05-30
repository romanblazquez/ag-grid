import { inject, Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Context } from '../model/search-context.model';
import { SearchContext } from '../model/search-context.model';
import { SearchDataSourceFn, SearchInitialDataFn } from '../model/search-data-source.model';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import { LegacyDataAccessFacadeService } from '@trade-platform/shared/ui/common-search';
import { SEARCH_CONTEXT_REGISTRY } from './search-context.registry';

@Injectable()
export class DataAccessFacadeService {
  private readonly legacy = inject(LegacyDataAccessFacadeService);
  private readonly customContexts = new Map<string, Context>();

  readonly initialDataPersisted$ = this.legacy.initialDataPersisted$.asObservable();

  registerContext(key: string, context: Context): void {
    this.customContexts.set(key, context);
  }

  getServiceContext(searchType: string): Context {
    if (this.customContexts.has(searchType)) {
      return this.customContexts.get(searchType)!;
    }
    const legacyCtx = this.legacy.getServiceContext(searchType as any) ?? {};
    const registryCtx = SEARCH_CONTEXT_REGISTRY[searchType] ?? {};
    return { ...registryCtx, ...legacyCtx } as Context;
  }

  getSuggestedData(
    ctx: Context,
    searchType: string,
    query: string,
    dataSourceFn?: SearchDataSourceFn,
  ): Observable<AbstractData[] | TreeNode[]> {
    if (dataSourceFn) {
      return dataSourceFn(query);
    }
    const legacyCtx = this.legacy.getServiceContext(searchType as any);
    return this.legacy.getSuggestedData(legacyCtx, searchType as any, query);
  }

  getInitialData(
    ctx: Context,
    searchType: string,
    initialDataFn?: SearchInitialDataFn,
    dataSourceFn?: SearchDataSourceFn,
  ): Observable<AbstractData[] | TreeNode[]> {
    if (initialDataFn) {
      return initialDataFn();
    }
    if (dataSourceFn) {
      return dataSourceFn('');
    }
    const legacyCtx = this.legacy.getServiceContext(searchType as any);
    return this.legacy.getInitialData(legacyCtx, searchType as any);
  }

  loadInitialData(ctx: SearchContext): Observable<any> {
    return this.legacy.loadInitialData(ctx as any);
  }

  loadPreferences(ctx: SearchContext): void {
    this.legacy.loadPreferences(ctx as any);
  }

  setPreference(
    ctx: SearchContext,
    data: unknown[],
    isTreeView: boolean | undefined,
  ): void {
    this.legacy.setPreference(ctx as any, data, isTreeView);
  }
}
