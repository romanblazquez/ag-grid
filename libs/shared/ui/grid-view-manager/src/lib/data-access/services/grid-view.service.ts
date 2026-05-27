import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { GridViewModel } from '../../models/grid-view.model';
import {
  GridViewPreferenceConfig,
  GRID_VIEW_CONSTRAINTS,
} from '../../models/grid-view-state.model';
import { v4 as uuidv4 } from 'uuid';
import { GridState } from 'ag-grid-community';
import { sanitizeGridState } from '../grid-state/grid-state.utils';
import { GridViewStorageService } from './grid-view-storage.service';

@Injectable({
  providedIn: 'root',
})
export class GridViewService {
  public constructor(private readonly storage: GridViewStorageService) {}

  public async getCurrentPrefState(
    gridId: string,
    appName?: string,
  ): Promise<GridState> {
    return this.storage.getCurrentPrefState(gridId, appName);
  }

  public loadViews(
    gridId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel[]> {
    return this.storage.loadViews(gridId, columnDefs, appName);
  }

  public saveAllViews(
    gridId: string,
    views: GridViewModel[],
    appName?: string,
  ): Observable<void> {
    return this.storage.saveAllViews(gridId, views, appName);
  }

  public deleteAllViews(gridId: string, appName?: string): Observable<void> {
    return this.storage.deleteAllViews(gridId, appName);
  }

  public getConfig(gridId: string, appName?: string): GridViewPreferenceConfig {
    return this.storage.getConfig(gridId, appName);
  }

  private saveViewsInternal(
    gridId: string,
    views: GridViewModel[],
    appName?: string,
  ): Observable<void> {
    return this.storage.saveAllViews(gridId, views, appName);
  }

  /**
   * Create or update a draft view for the given source view.
   * Auto-names it "{sourceName} - Draft" and marks it as selected.
   * Only one draft can exist at a time per grid.
   */
  public saveDraft(
    gridId: string,
    sourceViewId: string,
    sourceViewName: string,
    draftGridState: GridState,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      map((existingViews) => {
        const existingDraft = existingViews.find((v) => v.isDraft);
        // Use the caller-supplied name as the authority — avoids ID-lookup failures
        // when the source is a system default whose ID may differ across loads.
        const draftName = `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}${sourceViewName}${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`;
        const now = new Date();

        let draft: GridViewModel;
        if (existingDraft) {
          draft = {
            ...existingDraft,
            gridState: structuredClone(draftGridState) as GridState,
            draftSourceViewId: sourceViewId,
            name: draftName,
            updatedAt: now,
          };
        } else {
          draft = {
            id: uuidv4(),
            name: draftName,
            description: `Draft of ${sourceViewName}`,
            isDefault: false,
            isSelected: true,
            isDraft: true,
            draftSourceViewId: sourceViewId,
            gridState: structuredClone(draftGridState) as GridState,
            createdAt: now,
            updatedAt: now,
          };
        }

        const updatedViews = existingViews
          .filter((v) => !v.isDraft)
          .map((v) => ({ ...v, isSelected: false }));
        updatedViews.push(draft);

        return { draft, updatedViews };
      }),
      switchMap(({ draft, updatedViews }) =>
        this.saveViewsInternal(gridId, updatedViews, appName).pipe(
          map(() => draft),
          catchError((err) => {
            console.warn('[GridViewService] Failed to persist draft:', err);
            return of(draft);
          }),
        ),
      ),
    );
  }

  /**
   * Delete the current draft view for the given grid.
   * No-op if no draft exists.
   */
  public deleteDraft(
    gridId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
    fallbackViewId?: string,
  ): Observable<void> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      switchMap((existingViews) => {
        const hasDraft = existingViews.some((v) => v.isDraft);
        if (!hasDraft) return of(undefined);

        const withoutDraft = existingViews.filter((v) => !v.isDraft);

        // Determine which view should be selected after the draft is removed.
        // Priority: explicit fallback → current default view → first user view.
        const targetId =
          fallbackViewId ??
          withoutDraft.find((v) => v.isDefault)?.id ??
          withoutDraft[0]?.id;

        const updatedViews = withoutDraft.map((v) => ({
          ...v,
          isSelected: v.id === targetId,
        }));

        return this.saveViewsInternal(gridId, updatedViews, appName).pipe(
          catchError((err) => {
            console.warn('[GridViewService] Failed to delete draft:', err);
            return of(undefined);
          }),
        );
      }),
    );
  }

  /**
   * Commit the draft: update the source view with draft's gridState and remove the draft.
   *
   * - If source is a regular user view: updates it in-place, removes the draft,
   *   returns { committed: true, sourceView }.
   * - If source is a system default (preset) or source not found:
   *   returns { committed: false, draftView, sourceView? } so the caller can
   *   prompt "Save As New View" pre-filled with the source name (minus the draft
   *   suffix). The preset is never mutated.
   */
  public commitDraft(
    gridId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<{
    committed: boolean;
    sourceView?: GridViewModel;
    draftView?: GridViewModel;
  }> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      switchMap((existingViews) => {
        const draftView = existingViews.find((v) => v.isDraft);
        if (!draftView) {
          return throwError(() => new Error('No draft view found to commit'));
        }

        const sourceView = existingViews.find(
          (v) => v.id === draftView.draftSourceViewId,
        );

        // System defaults are read-only — cannot be overwritten.
        // Return draftView + sourceView to let the caller pre-fill "Save As New View".
        if (!sourceView || sourceView.isSystemDefault) {
          return of({ committed: false as const, draftView, sourceView });
        }

        const updatedSource: GridViewModel = {
          ...sourceView,
          gridState: structuredClone(draftView.gridState) as GridState,
          updatedAt: new Date(),
          isSelected: true,
        };

        const updatedViews = existingViews
          .filter((v) => !v.isDraft)
          .map((v) =>
            v.id === updatedSource.id
              ? updatedSource
              : { ...v, isSelected: false },
          );

        return this.saveViewsInternal(gridId, updatedViews, appName).pipe(
          map(() => ({ committed: true as const, sourceView: updatedSource })),
        );
      }),
    );
  }

  public createView(
    gridId: string,
    view: Omit<GridViewModel, 'id' | 'createdAt' | 'updatedAt'>,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      map((existingViews) => {
        // Validate constraints — drafts don't count toward the limit
        const nonDraftViews = existingViews.filter((v) => !v.isDraft);
        if (nonDraftViews.length >= GRID_VIEW_CONSTRAINTS.MAX_VIEWS) {
          throw new Error(
            `Maximum number of views (${GRID_VIEW_CONSTRAINTS.MAX_VIEWS}) reached`,
          );
        }

        if (
          existingViews.some(
            (v) => v.name.toLowerCase() === view.name.toLowerCase(),
          )
        ) {
          throw new Error(`A view with the name "${view.name}" already exists`);
        }

        const validColIds = new Set(
          columnDefs.map((col) => col.colId as string),
        );

        const now = new Date();
        let gridState = view.gridState;
        if (typeof gridState === 'string') {
          gridState = JSON.parse(gridState as string) as GridState;
        }

        // Clone gridState before sanitizing to avoid mutating the input
        const clonedGridState = structuredClone(gridState);

        const newView: GridViewModel = {
          ...view,
          isDefault: false,
          isSelected: true,
          gridState: sanitizeGridState(
            clonedGridState,
            validColIds,
          ) as GridState,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        const updatedViews = view.isDefault
          ? existingViews.map((v) => ({
              ...v,
              isDefault: false,
              isSelected: false,
            }))
          : existingViews.map((v) => ({ ...v, isSelected: false }));

        updatedViews.push(newView);

        return { newView, updatedViews };
      }),
      map(({ newView, updatedViews }) => {
        this.saveViewsInternal(gridId, updatedViews, appName).subscribe();
        return newView;
      }),
    );
  }

  public updateView(
    gridId: string,
    view: GridViewModel,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<GridViewModel> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      map((existingViews) => {
        const index = existingViews.findIndex((v) => v.id === view.id);
        if (index === -1) {
          throw new Error(`View with id "${view.id}" not found`);
        }

        if (existingViews[index].isSystemDefault) {
          throw new Error(
            'Cannot update system default views. Please copy the view to create your own version.',
          );
        }

        if (
          existingViews.some(
            (v) =>
              v.id !== view.id &&
              v.name.toLowerCase() === view.name.toLowerCase(),
          )
        ) {
          throw new Error(`A view with the name "${view.name}" already exists`);
        }

        const updatedView: GridViewModel = {
          ...view,
          gridState: structuredClone(view.gridState),
          updatedAt: new Date(),
        };

        const updatedViews = existingViews.map((v, i) => {
          if (i === index) {
            return updatedView;
          }
          if (updatedView.isDefault && v.isDefault) {
            return {
              ...v,
              gridState: structuredClone(v.gridState),
              isDefault: false,
            };
          }
          return {
            ...v,
            gridState: structuredClone(v.gridState),
          };
        });

        return { updatedView, updatedViews };
      }),
      map(({ updatedView, updatedViews }) => {
        this.saveViewsInternal(gridId, updatedViews, appName).subscribe();
        return updatedView;
      }),
    );
  }

  public deleteView(
    gridId: string,
    viewId: string,
    columnDefs: Array<{ colId: string }>,
    appName?: string,
  ): Observable<void> {
    return this.loadViews(gridId, columnDefs, appName).pipe(
      map((existingViews) => {
        const viewToDelete = existingViews.find((v) => v.id === viewId);
        if (!viewToDelete) {
          throw new Error(`View with id "${viewId}" not found`);
        }

        if (viewToDelete.isSystemDefault) {
          throw new Error(
            'Cannot delete system default views. System defaults are read-only.',
          );
        }

        if (existingViews.length === 1) {
          throw new Error('Cannot delete the last remaining view');
        }

        if (viewToDelete.isDefault && existingViews.length > 1) {
          throw new Error(
            'Cannot delete the default view. Please set another view as default first.',
          );
        }
        const updatedViews = existingViews.filter((v) => v.id !== viewId);
        return updatedViews;
      }),
      map((updatedViews) => {
        this.saveViewsInternal(gridId, updatedViews, appName).subscribe();
      }),
    );
  }
}
