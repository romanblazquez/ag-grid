import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Context } from '../model/search-context.model';
import { SearchContext } from '../model/search-context.model';
import { SearchType } from '../model/search-type.enum';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import { SEARCH_CONTEXT_REGISTRY } from './search-context.registry';
import {
  MOCK_INSTRUMENT_TREE,
  suggestionsFor,
} from './mock-suggestions';

/**
 * Mock implementation of the data-access layer used by hds-common-search.
 *
 * In a real app this would proxy a REST/GraphQL backend; here we return
 * filtered in-memory data with a small artificial delay so the UX (loading
 * states, dropdown opening) feels realistic.
 */
@Injectable({ providedIn: 'root' })
export class DataAccessFacadeService {
  private readonly _initialDataPersisted$ = new BehaviorSubject<boolean>(true);
  readonly initialDataPersisted$ = this._initialDataPersisted$.asObservable();

  private readonly preferences = signal<Record<string, unknown>>({});

  getServiceContext(searchType: SearchType): Context {
    return SEARCH_CONTEXT_REGISTRY[searchType];
  }

  getSuggestedData(
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

  getInitialData(
    ctx: Context,
    searchType: SearchType,
  ): Observable<AbstractData[] | TreeNode[]> {
    void ctx;
    if (searchType === SearchType.InstrumentType) {
      return of(MOCK_INSTRUMENT_TREE);
    }
    return of(suggestionsFor(searchType));
  }

  loadInitialData(ctx: SearchContext): Observable<boolean> {
    void ctx;
    return of(true);
  }

  loadPreferences(ctx: SearchContext): void {
    void ctx;
    // No-op for mock impl.
  }

  setPreference(
    ctx: SearchContext,
    data: unknown[],
    isTreeView: boolean | undefined,
  ): void {
    void isTreeView;
    this.preferences.update((p) => ({ ...p, [ctx.searchType]: data }));
  }

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
