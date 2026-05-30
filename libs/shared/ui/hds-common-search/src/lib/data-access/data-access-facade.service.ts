import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Context, SearchContext } from '../model/search-context.model';
import { SearchDataSourceFn, SearchInitialDataFn } from '../model/search-data-source.model';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import {
  IPREFS_STORE,
  LEGACY_DATA_ACCESS_FACADE,
} from './external-services.tokens';
import { SEARCH_CONTEXT_REGISTRY } from './search-context.registry';

/**
 * Data-access facade for hds-common-search.
 *
 * Fully standalone: when no external services are provided, the facade
 * operates purely on the consumer-supplied `dataSourceFn` / `initialDataFn`
 * callbacks on the SearchContext.
 *
 * Optional integrations (wire via InjectionTokens):
 *  - `LEGACY_DATA_ACCESS_FACADE`: bridge to a service-based data layer
 *    (e.g. the project's `DataAccessFacadeService` in common-search) for
 *    consumers that prefer registry-driven configuration over per-context
 *    callbacks.
 *  - `IPREFS_STORE`: persist user selections (iprefs) to localStorage or
 *    a remote store. Mirrors writes from `setPreference()`.
 */
@Injectable()
export class DataAccessFacadeService {
  private readonly legacy = inject(LEGACY_DATA_ACCESS_FACADE, {
    optional: true,
  });
  private readonly iprefs = inject(IPREFS_STORE, { optional: true });
  private readonly customContexts = new Map<string, Context>();

  /** Mirror the legacy `initialDataPersisted$` if available; otherwise emit
   * a static `true` so consumers depending on it never hang. */
  readonly initialDataPersisted$: Observable<boolean> =
    this.legacy?.initialDataPersisted$.asObservable() ?? of(true);

  registerContext(key: string, context: Context): void {
    this.customContexts.set(key, context);
  }

  getServiceContext(searchType: string): Context {
    if (this.customContexts.has(searchType)) {
      return this.customContexts.get(searchType) as Context;
    }
    const legacyCtx = this.legacy?.getServiceContext(searchType) ?? {};
    const registryCtx = SEARCH_CONTEXT_REGISTRY[searchType] ?? {};
    return { ...registryCtx, ...legacyCtx } as Context;
  }

  getSuggestedData(
    ctx: Context,
    searchType: string,
    query: string,
    dataSourceFn?: SearchDataSourceFn,
  ): Observable<AbstractData[] | TreeNode[]> {
    if (dataSourceFn) return dataSourceFn(query);
    if (this.legacy) {
      const legacyCtx = this.legacy.getServiceContext(searchType);
      return this.legacy.getSuggestedData(legacyCtx, searchType, query);
    }
    return of([]);
  }

  getInitialData(
    ctx: Context,
    searchType: string,
    initialDataFn?: SearchInitialDataFn,
    dataSourceFn?: SearchDataSourceFn,
  ): Observable<AbstractData[] | TreeNode[]> {
    if (initialDataFn) return initialDataFn();
    if (dataSourceFn) return dataSourceFn('');
    if (this.legacy) {
      const legacyCtx = this.legacy.getServiceContext(searchType);
      return this.legacy.getInitialData(legacyCtx, searchType);
    }
    return of([]);
  }

  loadInitialData(ctx: SearchContext): Observable<unknown> {
    return this.legacy?.loadInitialData(ctx) ?? of(true);
  }

  loadPreferences(ctx: SearchContext): void {
    this.legacy?.loadPreferences(ctx);
  }

  setPreference(
    ctx: SearchContext,
    data: unknown[],
    isTreeView: boolean | undefined,
  ): void {
    this.legacy?.setPreference(ctx, data, isTreeView);
    // Mirror to the iprefs store if provided — typically backed by
    // localStorage so selections survive page refresh.
    this.iprefs?.set(ctx.searchType, data);
  }
}
