import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { CommonSearchInteractionType } from '../../model/common-search-interaction-type.enum';

export interface CommonSearchState {
  isResultsLoaded: boolean;
  isFocusedOut: boolean;
  autoSelect: string | null;
  insertMethod: CommonSearchInteractionType | null;
}

const defaultState: CommonSearchState = {
  isResultsLoaded: false,
  isFocusedOut: false,
  autoSelect: null,
  insertMethod: null,
};

/**
 * Lightweight ComponentStore replacement using BehaviorSubject.
 * Replaces @ngrx/component-store dependency.
 */
@Injectable()
export class CommonSearchStore {
  private readonly state$ = new BehaviorSubject<CommonSearchState>({ ...defaultState });

  public readonly autoSelectActive$ = this.state$.pipe(
    map(({ isResultsLoaded, isFocusedOut }) => isResultsLoaded && isFocusedOut),
  );

  public readonly autoSelectValue$ = this.state$.pipe(
    map(({ autoSelect }) => autoSelect),
  );

  public readonly insertMethod = this.state$.pipe(
    map(({ insertMethod }) => insertMethod),
  );

  public select<R>(projector: (state: CommonSearchState) => R) {
    return this.state$.pipe(map(projector));
  }

  public updateResultsLoadedState(ready: boolean): void {
    this.patchState({ isResultsLoaded: ready });
  }

  public updateFocusOutState(ready: boolean): void {
    this.patchState({ isFocusedOut: ready });
  }

  public updateAutoSelect(value: string): void {
    this.patchState({ autoSelect: value });
  }

  public updateInsertMethod(value: CommonSearchInteractionType): void {
    this.patchState({ insertMethod: value });
  }

  public resetState(): void {
    this.state$.next({ ...defaultState });
  }

  private patchState(partial: Partial<CommonSearchState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }
}
