import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Context, SearchContext } from '../model/search-context.model';
import { SearchDataSourceFn, SearchInitialDataFn } from '../model/search-data-source.model';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import { SEARCH_CONTEXT_REGISTRY } from './search-context.registry';

/**
 * Data-access layer used by hds-common-search.
 *
 * Consumers provide `dataSourceFn` / `initialDataFn` on the SearchContext —
 * the facade delegates directly to those callbacks. The registry is only
 * used for UI metadata (placeholder, field widths, panel width, etc.).
 */
@Injectable({ providedIn: 'root' })
export class DataAccessFacadeService {
  private readonly _initialDataPersisted$ = new BehaviorSubject<boolean>(true);
  readonly initialDataPersisted$ = this._initialDataPersisted$.asObservable();

  private readonly preferences = signal<Record<string, unknown[]>>({});

  private readonly customContexts = new Map<string, Context>();

  registerContext(key: string, context: Context): void {
    this.customContexts.set(key, context);
  }

  getServiceContext(searchType: string): Context {
    return (
      this.customContexts.get(searchType) ??
      SEARCH_CONTEXT_REGISTRY[searchType] ??
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
    return of([]);
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
    return of([]);
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

  getPreference<T>(
    key: string,
    dataPool?: T[],
    filterKey?: keyof T,
  ): T[] {
    const prefs = (this.preferences()[key] ?? []) as unknown[];
    if (!dataPool || filterKey === undefined) {
      return [...prefs] as T[];
    }

    const mapped: T[] = [];
    for (const pref of prefs) {
      const match = dataPool.find(
        (item) =>
          (item as Record<string, unknown>)[filterKey as string] === pref,
      );
      if (match) mapped.push(match);
    }
    return mapped;
  }

  stagePreference(key: string, data: unknown[]): void {
    this.preferences.update((p) => ({ ...p, [key]: data }));
  }

  clearPendingPreferences(keys: string[]): void {
    this.preferences.update((p) => {
      const next = { ...p };
      for (const key of keys) {
        next[key] = [];
      }
      return next;
    });
  }

  commitPreferences(): void {
    // no-op: the real app handles iprefs persistence
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
}
