import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { GridViewModel } from '../../models/grid-view.model';
import {
  GridViewPreferenceConfig,
  GridViewPreferenceData,
} from '../../models/grid-view-state.model';
import { GridState } from 'ag-grid-community';
import { getAllDefaultViewsForApp } from '../defaults/defaultViews';
import { createDefaultView } from './util/create-default-view.util';
import { GridDefaultsConfigService } from './grid-defaults-config.service';

/**
 * Handles all localStorage read/write operations and data-normalisation helpers.
 * Replaces the original iPref-based implementation with localStorage persistence.
 *
 * Storage key convention: gvm:{appName}:{gridId}
 */
@Injectable({ providedIn: 'root' })
export class GridViewStorageService {
  private readonly PREFERENCE_VERSION = 1;

  public constructor(
    private readonly gridDefaultsConfigService: GridDefaultsConfigService,
  ) {}

  public async getCurrentPrefState(
    gridId: string,
    appName?: string,
  ): Promise<GridState> {
    const key = this.buildStorageKey(gridId, appName) + ':gridState';
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object') {
          return parsed as GridState;
        }
      }
      return {};
    } catch (e: unknown) {
      console.warn('Error fetching current grid state from localStorage:', e);
      return {};
    }
  }

  public loadViews(
    gridId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel[]> {
    const validColIds = new Set(columnDefs.map((col) => col.colId as string));

    return this.getSystemDefaults(appName, gridId).pipe(
      switchMap((systemDefaults) => {
        const raw = this.readFromStorage(gridId, appName);
        return this.handleLoadedData(
          raw,
          gridId,
          validColIds,
          appName,
          systemDefaults,
        );
      }),
    );
  }

  public saveAllViews(
    gridId: string,
    views: GridViewModel[],
    appName?: string,
  ): Observable<void> {
    return this.saveViewsInternal(gridId, views, appName);
  }

  public deleteAllViews(gridId: string, appName?: string): Observable<void> {
    try {
      const key = this.buildStorageKey(gridId, appName);
      localStorage.removeItem(key);
      console.log('[GridViewStorage] All views deleted successfully');
      return of(undefined);
    } catch (error) {
      console.error('[GridViewStorage] Error deleting all views:', error);
      return throwError(() => new Error('Failed to delete all views from localStorage'));
    }
  }

  public getConfig(gridId: string, appName?: string): GridViewPreferenceConfig {
    return {
      appName: appName ?? 'default',
      node: `gvm:${appName}`,
      gridId: `${gridId}`,
    };
  }

  private buildStorageKey(gridId: string, appName?: string): string {
    return `gvm:${appName ?? 'default'}:${gridId}`;
  }

  private readFromStorage(
    gridId: string,
    appName?: string,
  ): GridViewPreferenceData | null {
    try {
      const key = this.buildStorageKey(gridId, appName);
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as GridViewPreferenceData;
    } catch {
      return null;
    }
  }

  private saveViewsInternal(
    gridId: string,
    views: GridViewModel[],
    appName?: string,
  ): Observable<void> {
    console.log(
      '[GridViewStorage] saveViewsInternal called for gridId:',
      gridId,
      'with views:',
      views,
    );

    try {
      const userViews = views.filter((v) => !v.isSystemDefault);
      const selectedViewId = views.find((v) => v.isSelected)?.id ?? null;

      const data: GridViewPreferenceData = {
        views: userViews,
        version: this.PREFERENCE_VERSION,
        selectedViewId,
      };

      const key = this.buildStorageKey(gridId, appName);
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[GridViewStorage] Views saved successfully');
      return of(undefined);
    } catch (error) {
      console.error('[GridViewStorage] Error saving views:', error);
      return throwError(() => new Error('Failed to save views to localStorage'));
    }
  }

  private handleLoadedData(
    data: GridViewPreferenceData | null,
    gridId: string,
    validColIds: Set<string>,
    appName?: string,
    systemDefaults: GridViewModel[] = [],
  ): Observable<GridViewModel[]> {
    if (!data) {
      return this.handleFirstTimeLoad(gridId, systemDefaults, validColIds, appName);
    }

    const parsed = this.parsePreferenceData(data);
    if (!parsed) {
      return of(
        systemDefaults.length > 0
          ? systemDefaults
          : createDefaultView(validColIds),
      );
    }

    const userViews = parsed.views;
    if (userViews.length === 0) {
      return this.handleEmptyViews(gridId, systemDefaults, validColIds, appName);
    }

    const allViews = this.reconcileViewSelection(
      userViews,
      systemDefaults,
      parsed.selectedViewId ?? null,
    );

    return of(this.applyDraftOrFallbackSelection(allViews));
  }

  /**
   * Applies persisted or legacy selection across system defaults and user
   * views, returning the merged list without draft/fallback logic.
   */
  private reconcileViewSelection(
    userViews: GridViewModel[],
    systemDefaults: GridViewModel[],
    persistedSelectedId: string | null,
  ): GridViewModel[] {
    let reconciledSystemDefaults = systemDefaults;
    let reconciledUserViews = userViews;

    if (persistedSelectedId) {
      // Apply persisted selection authoritatively across both lists.
      reconciledSystemDefaults = systemDefaults.map((v) => ({
        ...v,
        isSelected: v.id === persistedSelectedId,
      }));
      reconciledUserViews = userViews.map((v) => ({
        ...v,
        isSelected: v.id === persistedSelectedId,
      }));
    } else if (userViews.find((v) => v.isSelected)) {
      // Legacy data without selectedViewId — user view selection wins.
      reconciledSystemDefaults = systemDefaults.map((v) => ({
        ...v,
        isSelected: false,
      }));
    }

    return [...reconciledSystemDefaults, ...reconciledUserViews];
  }

  /**
   * Ensures exactly one view is selected: drafts take priority, then a
   * safety-net fallback to `isDefault` or the first view.
   */
  private applyDraftOrFallbackSelection(
    allViews: GridViewModel[],
  ): GridViewModel[] {
    const draftView = allViews.find((v) => v.isDraft);
    if (draftView) {
      return allViews.map((v) => ({ ...v, isSelected: v.id === draftView.id }));
    }

    if (!allViews.some((v) => v.isSelected) && allViews.length > 0) {
      const fallback = allViews.find((v) => v.isDefault) ?? allViews[0];
      return allViews.map((v) => ({ ...v, isSelected: v.id === fallback.id }));
    }

    return allViews;
  }

  private getSystemDefaults(
    appName?: string,
    gridId?: string,
  ): Observable<GridViewModel[]> {
    if (!appName || !gridId) return of([]);
    return this.gridDefaultsConfigService
      .getAllDefaultViewsForApp(appName, gridId)
      .pipe(
        map((views) =>
          views.map((view) => ({ ...view, isSystemDefault: true as const })),
        ),
        catchError(() =>
          of(
            getAllDefaultViewsForApp(appName).map((view) => ({
              ...view,
              isSystemDefault: true as const,
            })),
          ),
        ),
      );
  }

  private handleFirstTimeLoad(
    gridId: string,
    systemDefaults: GridViewModel[],
    validColIds: Set<string>,
    appName?: string,
  ): Observable<GridViewModel[]> {
    const defaultViews =
      systemDefaults.length > 0
        ? systemDefaults
        : createDefaultView(validColIds);

    return this.saveViewsInternal(gridId, defaultViews, appName).pipe(
      map(() => defaultViews),
      catchError((saveError) => {
        console.warn(
          '[GridViewStorage] Failed to save initial default views:',
          saveError,
        );
        return of(defaultViews);
      }),
    );
  }

  private handleEmptyViews(
    gridId: string,
    systemDefaults: GridViewModel[],
    validColIds: Set<string>,
    appName?: string,
  ): Observable<GridViewModel[]> {
    const defaultViews =
      systemDefaults.length > 0
        ? systemDefaults
        : createDefaultView(validColIds);
    return this.saveViewsInternal(gridId, defaultViews, appName).pipe(
      map(() => defaultViews),
      catchError((saveError) => {
        console.warn(
          '[GridViewStorage] Failed to save default views to empty array:',
          saveError,
        );
        return of(defaultViews);
      }),
    );
  }

  private parsePreferenceData(
    data: GridViewPreferenceData,
  ): { views: GridViewModel[]; selectedViewId?: string | null } | null {
    let parsed: unknown;

    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data as string);
      } catch (e: unknown) {
        console.error('[GridViewStorage] Error parsing localStorage value:', e);
        return null;
      }
    } else if (typeof data === 'object' && 'views' in data) {
      parsed = data;
    } else {
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || !('views' in parsed)) {
      return null;
    }

    return parsed as { views: GridViewModel[]; selectedViewId?: string | null };
  }
}
