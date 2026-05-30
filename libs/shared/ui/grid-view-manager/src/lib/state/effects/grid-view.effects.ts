import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  tap,
  take,
  debounceTime,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as gridViewActions from '../actions/grid-view.actions';
import { GridViewService } from '../../data-access/services/grid-view.service';
import { createGridSelectors } from '../reducers';

@Injectable()
export class GridViewEffects {
  public constructor(
    private readonly actions$: Actions,
    private readonly store: Store,
    private readonly gridViewService: GridViewService,
  ) {}

  // Load grid views from iPref
  public loadGridViews$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.loadGridViews),
      switchMap(({ gridId, columnDefs, appName }) =>
        this.gridViewService.loadViews(gridId, columnDefs, appName).pipe(
          map((views) =>
            gridViewActions.loadGridViewsSuccess({ gridId, views }),
          ),
          catchError((error: Error) =>
            of(
              gridViewActions.loadGridViewsFailure({
                gridId,
                error: error.message || 'Failed to load grid views',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Create new view
  public createGridView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.createGridView),
      tap(({ view }) =>
        console.log('[GridViewEffects] Creating view:', view.name),
      ),
      switchMap(({ gridId, view, columnDefs, appName }) =>
        this.gridViewService.createView(gridId, view, columnDefs, appName).pipe(
          tap((createdView) =>
            console.log(
              '[GridViewEffects] View created successfully:',
              `${createdView.id} - ${createdView.name}`,
            ),
          ),
          map((createdView) =>
            gridViewActions.createGridViewSuccess({
              gridId,
              view: createdView,
            }),
          ),
          catchError((error: Error) => {
            console.error('[GridViewEffects] Error creating view:', error);
            return of(
              gridViewActions.createGridViewFailure({
                gridId,
                error: error.message || 'Failed to create grid view',
              }),
            );
          }),
        ),
      ),
    ),
  );

  // Update existing view
  public updateGridView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.updateGridView),
      switchMap(({ gridId, view, columnDefs, appName }) =>
        this.gridViewService.updateView(gridId, view, columnDefs, appName).pipe(
          map((updatedView) =>
            gridViewActions.updateGridViewSuccess({
              gridId,
              view: updatedView,
            }),
          ),
          catchError((error: Error) =>
            of(
              gridViewActions.updateGridViewFailure({
                gridId,
                error: error.message || 'Failed to update grid view',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Delete view
  public deleteGridView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.deleteGridView),
      switchMap(({ gridId, viewId, columnDefs, appName }) =>
        this.gridViewService
          .deleteView(gridId, viewId, columnDefs, appName)
          .pipe(
            map(() =>
              gridViewActions.deleteGridViewSuccess({ gridId, viewId }),
            ),
            catchError((error: Error) =>
              of(
                gridViewActions.deleteGridViewFailure({
                  gridId,
                  error: error.message || 'Failed to delete grid view',
                }),
              ),
            ),
          ),
      ),
    ),
  );

  // Set default view
  public setDefaultView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.setDefaultView),
      switchMap(({ gridId, viewId }) => {
        const selectors = createGridSelectors(gridId);
        return this.store.select(selectors.getViews).pipe(
          map((views) => {
            // Update the isDefault flag for all views
            const updatedViews = views.map((v) => ({
              ...v,
              isDefault: v.id === viewId,
            }));
            return { gridId, viewId, views: updatedViews };
          }),
        );
      }),
      switchMap(({ gridId, viewId, views }) =>
        this.gridViewService.saveAllViews(gridId, views).pipe(
          map(() => gridViewActions.setDefaultViewSuccess({ gridId, viewId })),
          catchError((error: Error) =>
            of(
              gridViewActions.setDefaultViewFailure({
                gridId,
                error: error.message || 'Failed to set default view',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Apply view to grid (side effect only, no state change)
  public applyGridView$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(gridViewActions.applyGridView),
        tap(({ gridId, view }) => {
          console.log(
            `[GridViewEffects] Applying view "${view.name}" to grid "${gridId}"`,
          );
          // This will be handled by the component that subscribes to selectedView changes
        }),
      ),
    { dispatch: false },
  );

  // Auto-select view after successful creation
  // Note: createView service already saves the view with isSelected: true
  // so we don't need to persist again
  public selectViewAfterCreate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.createGridViewSuccess),
      tap(({ view }) =>
        console.log(
          '[GridViewEffects] Auto-selecting created view:',
          `${view.id} - ${view.name}`,
        ),
      ),
      map(({ gridId, view }) =>
        gridViewActions.selectGridView({ gridId, viewId: view.id }),
      ),
    ),
  );

  // Persist selected view to iPref when selection changes.
  // Before persisting, delete any existing draft — switching views discards unsaved drafts.
  public persistSelectedView$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(gridViewActions.selectGridView),
        // Debounce to avoid race conditions with createGridViewSuccess
        debounceTime(100),
        switchMap(({ gridId, viewId, appName }) => {
          const selectors = createGridSelectors(gridId);
          return this.store.select(selectors.getViews).pipe(
            take(1),
            switchMap((views) => {
              // Remove any draft (switching views discards unsaved drafts)
              const updatedViews = views
                .filter((v) => !v.isDraft)
                .map((v) => ({
                  ...v,
                  isSelected: v.id === viewId,
                }));
              console.log(
                '[GridViewEffects] Persisting view selection to iPref, appName:',
                appName,
              );
              return this.gridViewService.saveAllViews(
                gridId,
                updatedViews,
                appName,
              );
            }),
          );
        }),
      ),
    { dispatch: false },
  );

  // ── Draft Effects ──────────────────────────────────────────────────────────

  public saveDraftView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.saveDraftView),
      switchMap(
        ({
          gridId,
          sourceViewId,
          sourceViewName,
          draftGridState,
          columnDefs,
          appName,
        }) =>
          this.gridViewService
            .saveDraft(
              gridId,
              sourceViewId,
              sourceViewName,
              draftGridState,
              columnDefs,
              appName,
            )
            .pipe(
              map((view) =>
                gridViewActions.saveDraftViewSuccess({ gridId, view }),
              ),
              catchError((error: Error) =>
                of(
                  gridViewActions.saveDraftViewFailure({
                    gridId,
                    error: error.message || 'Failed to save draft view',
                  }),
                ),
              ),
            ),
      ),
    ),
  );

  public deleteDraftView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.deleteDraftView),
      switchMap(({ gridId, columnDefs, appName, fallbackViewId }) =>
        this.gridViewService
          .deleteDraft(gridId, columnDefs, appName, fallbackViewId)
          .pipe(
            map(() => gridViewActions.deleteDraftViewSuccess({ gridId })),
            catchError((error: Error) =>
              of(
                gridViewActions.deleteDraftViewFailure({
                  gridId,
                  error: error.message || 'Failed to delete draft view',
                }),
              ),
            ),
          ),
      ),
    ),
  );

  public commitDraftView$ = createEffect(() =>
    this.actions$.pipe(
      ofType(gridViewActions.commitDraftView),
      switchMap(({ gridId, columnDefs, appName }) =>
        this.gridViewService.commitDraft(gridId, columnDefs, appName).pipe(
          map((result) => {
            if (result.committed && result.sourceView) {
              return gridViewActions.commitDraftViewSuccess({
                gridId,
                sourceView: result.sourceView,
              });
            }
            // Source is a preset/system default — prompt UI to "Save As New View"
            return gridViewActions.commitDraftViewSaveAsNew({
              gridId,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              draftView: result.draftView!,
              sourceView: result.sourceView,
            });
          }),
          catchError((error: Error) =>
            of(
              gridViewActions.commitDraftViewFailure({
                gridId,
                error: error.message || 'Failed to commit draft view',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
