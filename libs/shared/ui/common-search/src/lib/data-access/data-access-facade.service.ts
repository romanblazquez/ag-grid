import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Context } from '../model/search-context.model';
import { SearchContext } from '../model/search-context.model';
import { SearchType } from '../model/search-type.enum';
import { SearchDataSourceFn, SearchInitialDataFn } from '../model/search-data-source.model';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import { SEARCH_CONTEXT_REGISTRY } from './search-context.registry';
import {
  MOCK_INSTRUMENT_TREE,
  suggestionsFor,
} from './mock-suggestions';

/**
 * Data-access layer used by hds-common-search. It serves two roles:
 *
 * 1. **Registry mode** (legacy/default): Looks up a `Context` by `SearchType`
 *    from the static `SEARCH_CONTEXT_REGISTRY` and fetches data from mock data.
 *
 * 2. **Callback mode** (new): When the consumer passes `dataSourceFn` on the
 *    `SearchContext`, the service delegates directly to that function — zero
 *    registry lookup, zero DI overhead on the hot path.
 *
 * New consumers should prefer callback mode for maximum performance.
 */
@Injectable({ providedIn: 'root' })
export class DataAccessFacadeService {
  private readonly _initialDataPersisted$ = new BehaviorSubject<boolean>(true);
  readonly initialDataPersisted$ = this._initialDataPersisted$.asObservable();

  private readonly preferences = signal<Record<string, unknown>>({});

  private readonly customContexts = new Map<string, Context>();

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Register a custom Context for a given search type key.
   * This allows consumers outside of the hardcoded registry to register
   * their own configurations at bootstrap or feature-init time.
   */
  registerContext(key: string, context: Context): void {
    this.customContexts.set(key, context);
  }

  getServiceContext(searchType: string): Context {
    return (
      this.customContexts.get(searchType) ??
      SEARCH_CONTEXT_REGISTRY[searchType as SearchType] ??
      this.fallbackContext(searchType)
    );
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
    return this.getSuggestedDataFromRegistry(ctx, searchType as SearchType, query);
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
    return this.getInitialDataFromRegistry(ctx, searchType as SearchType);
  }

  loadInitialData(ctx: SearchContext): Observable<boolean> {
    void ctx;
    return of(true);
  }

  loadPreferences(ctx: SearchContext): void {
    void ctx;
  }

  setPreference(
    ctx: SearchContext,
    data: unknown[],
    isTreeView: boolean | undefined,
  ): void {
    void isTreeView;
    this.preferences.update((p) => ({ ...p, [ctx.searchType]: data }));
  }

  // ── Registry-based data fetching (backward compat) ──────────────────

  private getSuggestedDataFromRegistry(
    ctx: Context,
    searchType: SearchType,
    query: string,
  ): Observable<AbstractData[] | TreeNode[]> {
    void ctx;
    if (searchType === SearchType.InstrumentType) {
      return of(this.filterTree(MOCK_INSTRUMENT_TREE, query)).pipe(delay(180));
    }
    const all = suggestionsFor(searchType);
    if (!query) return of(all).pipe(delay(120));
    const q = query.toLowerCase();
    return of(all.filter((row) => this.rowMatches(row, q))).pipe(delay(180));
  }

  private getInitialDataFromRegistry(
    ctx: Context,
    searchType: SearchType,
  ): Observable<AbstractData[] | TreeNode[]> {
    void ctx;
    if (searchType === SearchType.InstrumentType) {
      return of(MOCK_INSTRUMENT_TREE);
    }
    return of(suggestionsFor(searchType));
  }

  private fallbackContext(searchType: string): Context {
    return {
      searchType,
      placeholder: searchType,
      emitField: 'id',
      detailFields: [{ name: 'label', visible: true }],
      detailHeaders: ['Label'],
      fieldWidths: { label: 100 },
      panelWidth: 400,
      isTreeView: false,
      multiselect: true,
      errorMessage: `No results found for "${searchType}"`,
    };
  }

  // ── Utils ───────────────────────────────────────────────────────────

  private rowMatches(row: AbstractData, q: string): boolean {
    for (const v of Object.values(row)) {
      if (v === null || v === undefined) continue;
      if (`${v}`.toLowerCase().includes(q)) return true;
    }
    return false;
  }

  private filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    const out: TreeNode[] = [];
    for (const n of nodes) {
      const selfMatch = n.items.some((i) =>
        `${i.value ?? ''}`.toLowerCase().includes(q),
      );
      const filteredChildren = n.children
        ? this.filterTree(n.children, query)
        : undefined;
      if (selfMatch || (filteredChildren && filteredChildren.length > 0)) {
        out.push({
          ...n,
          children: filteredChildren,
        });
      }
    }
    return out;
  }
}
