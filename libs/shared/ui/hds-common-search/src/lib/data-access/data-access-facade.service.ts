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
  private readonly storageKey = 'trade-platform.common-search.iprefs';

  private readonly _initialDataPersisted$ = new BehaviorSubject<boolean>(true);
  readonly initialDataPersisted$ = this._initialDataPersisted$.asObservable();

  private readonly pendingPreferences = signal<Record<string, unknown[]>>({});
  private readonly committedPreferences = signal<Record<string, unknown[]>>(
    this.readCommittedPreferences(),
  );

  private readonly customContexts = new Map<string, Context>();

  constructor() {
    this.committedPreferences.set(this.readCommittedPreferences());
  }

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
    this.pendingPreferences.update((p) => ({ ...p, [ctx.searchType]: data }));
  }

  getPreference<T>(
    key: string,
    dataPool?: T[],
    filterKey?: keyof T,
  ): T[] {
    const preferences = (this.committedPreferences()[key] ?? []) as unknown[];
    if (!dataPool || filterKey === undefined) {
      return [...preferences] as T[];
    }

    const mapped: T[] = [];
    for (const preference of preferences) {
      const match = dataPool.find(
        (item) =>
          (item as Record<string, unknown>)[filterKey as string] === preference,
      );
      if (match) mapped.push(match);
    }
    return mapped;
  }

  stagePreference(key: string, data: unknown[]): void {
    this.pendingPreferences.update((p) => ({ ...p, [key]: data }));
  }

  clearPendingPreferences(keys: string[]): void {
    this.pendingPreferences.update((p) => {
      const next = { ...p };
      for (const key of keys) {
        next[key] = [];
      }
      return next;
    });
  }

  commitPreferences(): void {
    const next = {
      ...this.committedPreferences(),
      ...this.pendingPreferences(),
    };
    this.committedPreferences.set(next);
    this.writeCommittedPreferences(next);
    this.pendingPreferences.set({});
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

  private readCommittedPreferences(): Record<string, unknown[]> {
    const storage = this.getSessionStorage();
    if (!storage) return {};

    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return this.normalizePreferenceMap(parsed);
    } catch {
      return {};
    }
  }

  private writeCommittedPreferences(
    preferences: Record<string, unknown[]>,
  ): void {
    const storage = this.getSessionStorage();
    if (!storage) return;

    try {
      storage.setItem(this.storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota or browser privacy mode failures.
    }
  }

  private normalizePreferenceMap(
    preferences: Record<string, unknown>,
  ): Record<string, unknown[]> {
    const next: Record<string, unknown[]> = {};
    for (const [key, value] of Object.entries(preferences)) {
      next[key] = Array.isArray(value) ? [...value] : [];
    }
    return next;
  }

  private getSessionStorage(): Storage | undefined {
    try {
      return (globalThis as { sessionStorage?: Storage }).sessionStorage;
    } catch {
      return undefined;
    }
  }
}
