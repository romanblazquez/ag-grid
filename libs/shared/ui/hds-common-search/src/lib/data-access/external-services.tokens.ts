import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Context } from '../model/search-context.model';
import { SearchContext } from '../model/search-context.model';
import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';

/**
 * Optional external services that hds-common-search can bridge to. When a
 * consumer doesn't provide these, the facade falls back to the SearchContext
 * `dataSourceFn` / `initialDataFn` callbacks only — making the library fully
 * standalone for copy-paste into new projects.
 *
 * Wire a provider via the InjectionToken to enable backwards-compatible
 * service-based data fetching (the legacy DataAccessFacadeService bridge)
 * and / or localStorage-backed iprefs persistence.
 */

/** Public surface of the legacy data-access facade we may bridge to. */
export interface LegacyDataAccessFacade {
  initialDataPersisted$: BehaviorSubject<boolean>;
  getServiceContext(searchType: string): Context | undefined;
  getSuggestedData(
    context: Context | undefined,
    searchType: string,
    query: string,
  ): Observable<AbstractData[] | TreeNode[]>;
  getInitialData(
    context: Context | undefined,
    searchType: string,
  ): Observable<AbstractData[] | TreeNode[]>;
  loadInitialData(ctx: SearchContext): Observable<unknown>;
  loadPreferences(ctx: SearchContext): void;
  setPreference(
    ctx: SearchContext,
    data: unknown[],
    isTreeView: boolean | undefined,
  ): void;
}

/** Public surface of an iprefs (selection-persistence) store. */
export interface IprefsStore {
  set<T>(key: string, items: T[]): void;
  get<T>(key: string): T[];
}

export const LEGACY_DATA_ACCESS_FACADE = new InjectionToken<LegacyDataAccessFacade>(
  'hds-common-search.LEGACY_DATA_ACCESS_FACADE',
);

export const IPREFS_STORE = new InjectionToken<IprefsStore>(
  'hds-common-search.IPREFS_STORE',
);
