import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { IPrefV2Service } from '@fmr-pr000264/ames-ipref-v2-service';
import { GridViewModel } from '../../models/grid-view.model';
import {
  GridViewPreferenceConfig,
  GridViewPreferenceData,
} from '../../models/grid-view-state.model';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { GridState } from '@ag-grid-community/core';
import { getAllDefaultViewsForApp } from '../defaults/defaultViews';
import { createDefaultView } from './util/create-default-view.util';
import { GridDefaultsConfigService } from './grid-defaults-config.service';
import { safeJsonParse } from '@fmr-pr000539/shared/util/common';

/**
 * Handles all iPref read/write operations and data-normalisation helpers.
 */
@Injectable({ providedIn: 'root' })
export class GridViewStorageService {
  private readonly PREFERENCE_VERSION = 1;

  public constructor(
    private readonly iprefService: IPrefV2Service,
    private readonly runtimeEnvExtension: RuntimeConfigExt,
    private readonly gridDefaultsConfigService: GridDefaultsConfigService,
  ) {}

  public async getCurrentPrefState(
    gridId: string,
    appName?: string,
  ): Promise<GridState> {
    const config = this.getConfig(gridId, appName);
    try {
      const iPrefRes: unknown = await firstValueFrom(
        this.iprefService.getPrefValue(
          'EquityTrading',
          config.node,
          'gridState',
        ),
      );

      if (iPrefRes !== null && typeof iPrefRes === 'object') {
        return iPrefRes as GridState;
      }

      console.warn(
        'Invalid grid state format from iPref, returning empty state',
      );
      return {};
    } catch (e: unknown) {
      console.warn('Error fetching current grid state from iPref:', e);
      return {};
    }
  }

  public loadViews(
    gridId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel[]> {
    const config = this.getConfig(gridId, appName);
    const validColIds = new Set(columnDefs.map((col) => col.colId as string));

    return this.getSystemDefaults(appName, gridId).pipe(
      switchMap((systemDefaults) =>
        this.iprefService
          .getPrefValue(config.appName, config.node, gridId)
          .pipe(
            switchMap((data: GridViewPreferenceData) =>
              this.handleLoadedData(
                data,
                gridId,
                validColIds,
                appName,
                systemDefaults,
              ),
            ),
            catchError((error: Error) =>
              this.handleLoadError(error, validColIds, systemDefaults),
            ),
          ),
      ),
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
    return this.iprefService
      .deleteAllPrefs('EquityTrading', this.getConfig(gridId, appName).node)
      .pipe(
        map(() => undefined),
        tap(() =>
          console.log('[GridViewStorage] All views deleted successfully'),
        ),
        catchError((error) => {
          console.error('[GridViewStorage] Error deleting all views:', error);
          return throwError(
            () => new Error('Failed to delete all views from iPref'),
          );
        }),
      );
  }

  public getConfig(gridId: string, appName?: string): GridViewPreferenceConfig {
    return {
      appName: 'EquityTrading',
      node: `${this.runtimeEnvExtension.logicalEnvironment}:${appName}:GRID`,
      gridId: `${gridId}`,
    };
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
    const config = this.getConfig(gridId, appName);

    const userViews = views.filter((v) => !v.isSystemDefault);

    const selectedViewId = views.find((v) => v.isSelected)?.id ?? null;

    const data: GridViewPreferenceData = {
      views: userViews,
      version: this.PREFERENCE_VERSION,
      selectedViewId,
    };
    return this.iprefService
      .savePref(
        config.appName,
        config.node,
        config.gridId,
        JSON.stringify(data),
      )
      .pipe(
        map(() => undefined),
        tap(() => console.log('[GridViewStorage] Views saved successfully')),
        catchError((error) => {
          console.error('[GridViewStorage] Error saving views:', error);
          return throwError(() => new Error('Failed to save views to iPref'));
        }),
      );
  }

  private handleLoadedData(
    data: GridViewPreferenceData,
    gridId: string,
    validColIds: Set<string>,
    appName?: string,
    systemDefaults: GridViewModel[] = [],
  ): Observable<GridViewModel[]> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!data) {
      return this.handleFirstTimeLoad(
        gridId,
        systemDefaults,
        validColIds,
        appName,
      );
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
      return this.handleEmptyViews(
        gridId,
        systemDefaults,
        validColIds,
        appName,
      );
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
    let parsed;

    if (typeof data === 'string') {
      try {
        parsed = safeJsonParse(data);
      } catch (e: unknown) {
        console.error('[GridViewStorage] Error parsing iPref value:', e);
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

  private handleLoadError(
    error: Error,
    validColIds: Set<string>,
    systemDefaults: GridViewModel[] = [],
  ): Observable<GridViewModel[]> {
    console.warn(
      '[GridViewStorage] Error loading views from iPref:',
      error.message,
    );

    return of(
      systemDefaults.length > 0
        ? systemDefaults
        : createDefaultView(validColIds),
    );
  }
}
