import { Injectable } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridViewModel } from '../../models/grid-view.model';
import {
  AppDefaultView,
  SharedDefaultView,
} from '../defaults/default-views.types';
import { appDefaultViewsMap } from '../defaults/app-default-views.config';
import { sharedDefaultViews } from '../defaults/shared-default-views.config';

/**
 * Service responsible for providing default grid view configurations.
 * Replaces the original iConfig-based implementation with hardcoded defaults.
 *
 * The original service fetched from remote iConfig. This adaptation returns
 * the same data structure from the bundled configuration objects, providing
 * deterministic IDs so that a persisted selectedViewId survives page reloads.
 */
@Injectable({
  providedIn: 'root',
})
export class GridDefaultsConfigService {
  /**
   * Get the app-specific default view config.
   * Returns null if no configuration exists for the given appName/gridId.
   */
  public getDefaultViewForApp(
    appName: string,
    _gridId: string,
  ): Observable<AppDefaultView | null> {
    const config = appDefaultViewsMap[appName] ?? null;
    return of(config);
  }

  /**
   * Get shared views available for a specific app/grid combination.
   */
  public getSharedViewsForApp(
    appName: string,
    _gridId: string,
  ): Observable<SharedDefaultView[]> {
    const views = sharedDefaultViews.filter((view) =>
      view.availableFor.includes(appName),
    );
    return of(views);
  }

  /**
   * Get all default GridViewModel entries (app-specific + shared) for an app.
   * Results are marked as system defaults; callers should set isSystemDefault accordingly.
   * Uses deterministic IDs so that a persisted selectedViewId survives page reloads.
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
        // break the localStorage-stored selectedViewId reference.
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
}
