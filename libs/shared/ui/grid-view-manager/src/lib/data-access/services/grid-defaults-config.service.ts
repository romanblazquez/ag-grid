import { Inject, Injectable } from '@angular/core';
import { Observable, combineLatest, of, forkJoin } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { IConfigV2Service } from '@fmr-pr000264/ames-iconfig-v2-service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { GridViewModel } from '../../models/grid-view.model';
import {
  AppDefaultView,
  SharedDefaultView,
} from '../defaults/default-views.types';

const ICONFIG_TENANT = 'EquityTrading';

/**
 * Service responsible for fetching default grid view configurations from iConfig.
 * Falls back to hardcoded defaults if iConfig is unavailable or has no entry for the app.
 *
 * iConfig node convention:
 *   - App default:   {env}:Native:{appName}   key: <gridId>   value: JSON of { viewName, description, gridState }
 *   - Shared views:  {env}:GridDefaults:Shared  key: <viewName>  value: JSON of { viewName, description, availableFor, gridState }
 *
 * Example:
 *   Tenant: EquityTrading
 *   Node:   SIT:Native:eqt-execution-activity-ui
 *   Key:    trades-grid-component
 *   Value:  JSON string of { viewName, description, gridState }
 */
@Injectable({
  providedIn: 'root',
})
export class GridDefaultsConfigService {
  private readonly nodeCache = new Map<
    string,
    Observable<Record<string, string>>
  >();

  public constructor(
    @Inject(IConfigV2Service)
    private readonly iConfigService: IConfigV2Service,
    private readonly runtimeConfig: RuntimeConfigExt,
  ) {}

  /**
   * Get the app-specific default view config from iConfig.
   * Falls back to the hardcoded appDefaultViewsMap if iConfig has no entry.
   */
  public getDefaultViewForApp(
    appName: string,
    gridId: string,
  ): Observable<AppDefaultView | null> {
    // Each context has its own standalone node: e.g. SIT:Native:EQTEXECUTIONSACTIVITYUI:TRADES
    console.debug(
      `[GridDefaultsConfigService] Fetching default view for app "${appName}", gridId: "${gridId}"`,
    );
    const nodePath = `${this.runtimeConfig.logicalEnvironment}:Native:${appName}`;
    console.debug(
      `[GridDefaultsConfigService] Using iConfig node path: "${nodePath}"`,
    );
    return forkJoin({
      data: this.fetchNode(nodePath),
    }).pipe(
      map(({ data }) => {
        const raw = data[gridId];
        if (raw) {
          try {
            // Handle potential double-escaped JSON (value wrapped in extra quotes)
            let parsed: unknown = JSON.parse(raw) as unknown;
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed) as unknown;
            }
            const config = parsed as Omit<AppDefaultView, 'appName'>;
            return { appName, ...config } as AppDefaultView;
          } catch {
            console.warn(
              `[GridDefaultsConfigService] Failed to parse "${gridId}" for ${appName} from iConfig`,
            );
          }
        }
        return null;
      }),
    );
  }

  /**
   * Get shared views for a specific grid from iConfig.
   * Node: {env}:Native:{appName}:GridDefaults  key: {gridId}  value: SharedDefaultView[]
   * Each appName has its own standalone node.
   * Falls back to the hardcoded sharedDefaultViews array if iConfig has no entries.
   */
  public getSharedViewsForApp(
    appName: string,
    gridId: string,
  ): Observable<SharedDefaultView[]> {
    // Each context has its own node: e.g. SIT:Native:EQTEXECUTIONSACTIVITYUI:TRADES:GridDefaults
    const nodePath = `${this.runtimeConfig.logicalEnvironment}:Native:${appName}:GridDefaults`;
    return forkJoin({
      data: this.fetchNode(nodePath),
    }).pipe(
      map(({ data }) => {
        const raw = data[gridId];
        if (raw) {
          try {
            let parsed: unknown = JSON.parse(raw) as unknown;
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed) as unknown;
            }
            if (Array.isArray(parsed)) {
              return parsed as SharedDefaultView[];
            }
          } catch (e) {
            console.warn(
              `[GridDefaultsConfigService] Failed to parse shared views for "${gridId}" from node "${nodePath}". ` +
                `The value must be a valid JSON array (double-quoted keys and strings). ` +
                `Raw value received:`,
              raw,
            );
          }
        }

        return [];
      }),
    );
  }

  /**
   * Get all default GridViewModel entries (app-specific + shared) for an app.
   * Results are marked as system defaults; callers should set isSystemDefault accordingly.
   */
  public getAllDefaultViewsForApp(
    appName: string,
    gridId: string,
  ): Observable<GridViewModel[]> {
    return combineLatest([
      this.getDefaultViewForApp(appName, gridId),
      this.getSharedViewsForApp(appName, gridId),
    ]).pipe(
      map(([defaultView, sharedViews]) => {
        const views: GridViewModel[] = [];
        const now = new Date();

        // Use deterministic IDs for system defaults so the user's selection
        // survives a reload. uuidv4() would mint a new id every load and
        // break the iPref-stored selectedViewId reference.
        const systemId = (viewName: string): string =>
          `system:${appName}:${gridId}:${viewName}`;

        if (defaultView) {
          views.push({
            id: systemId(defaultView.viewName),
            name: defaultView.viewName,
            description: defaultView.description,
            isDefault: true,
            isSelected: true,
            gridState: defaultView.gridState,
            createdAt: now,
            updatedAt: now,
          });
        }

        for (const sv of sharedViews) {
          views.push({
            id: systemId(sv.viewName),
            name: sv.viewName,
            description: sv.description,
            isDefault: false,
            // Select first shared view only if there is no app-specific default
            isSelected: !defaultView && views.length === 0,
            gridState: sv.gridState,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Ensure at least one view is selected
        if (views.length > 0 && !views.some((v) => v.isSelected)) {
          views[0] = { ...views[0], isSelected: true };
        }

        return views;
      }),
    );
  }

  /**
   * Fetch all key-value pairs for an iConfig node, with in-memory caching.
   */
  private fetchNode(nodePath: string): Observable<Record<string, string>> {
    if (!this.nodeCache.has(nodePath)) {
      const obs$ = (
        this.iConfigService.getAllConfigurations(
          ICONFIG_TENANT,
          nodePath,
        ) as Observable<Record<string, string>>
      ).pipe(
        catchError((err: unknown) => {
          console.warn(
            `[GridDefaultsConfigService] iConfig unavailable for node "${nodePath}":`,
            err,
          );
          return of({} as Record<string, string>);
        }),
        shareReplay(1),
      );
      this.nodeCache.set(nodePath, obs$);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.nodeCache.get(nodePath)!;
  }
}
