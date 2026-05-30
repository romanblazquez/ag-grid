import { Injectable } from '@angular/core';
import {
  CustomGridState,
  sanitizeGridState,
  areGridStatesEqual,
} from '../data-access/grid-state/grid-state.utils';

export type GridChangeOrigin = 'user' | 'view-apply';

@Injectable()
export class GridEditSessionService {
  private origin: GridChangeOrigin = 'view-apply';
  private baseline: CustomGridState | null = null;
  private suppressDepth = 0;
  private tailTimer: ReturnType<typeof setTimeout> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  private static readonly SUPPRESSION_TAIL_MS = 250;

  public suppressChanges(fn: () => void): void {
    this.suppressDepth++;
    this.origin = 'view-apply';
    if (this.tailTimer !== null) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
    try {
      fn();
    } finally {
      // Schedule the release. When the timer is reset (another suppressChanges
      // call clears the previous timer), the single surviving callback owns ALL
      // accumulated depth — resetting to 0 unconditionally is correct.
      this.tailTimer = setTimeout(() => {
        this.suppressDepth = 0;
        this.origin = 'user';
        this.tailTimer = null;
      }, GridEditSessionService.SUPPRESSION_TAIL_MS); // see SUPPRESSION_TAIL_MS constant
    }
  }

  /**
   * Returns `true` only when the current event originated from a direct
   * user interaction (column move, filter change, etc.).
   */
  public isUserChange(): boolean {
    return this.origin === 'user';
  }

  /**
   * Used by the header component to roll the baseline forward whenever
   * AG Grid emits a state event during the suppression window.
   */
  public isSuppressing(): boolean {
    return this.suppressDepth > 0 || this.origin === 'view-apply';
  }

  /**
   * Records the current clean/committed grid state as the new baseline.
   * Must be called after every view load, view switch, draft commit, or
   * view save so that subsequent `hasChangedFromBaseline` calls compare
   * against the correct reference.
   */
  public commitBaseline(
    state: CustomGridState,
    validColIds: Set<string>,
  ): void {
    this.baseline = sanitizeGridState(
      JSON.parse(JSON.stringify(state)) as CustomGridState,
      validColIds,
    );
  }

  /**
   * Returns `true` if `currentState` is semantically different from the
   * committed baseline. Both states are sanitized before comparison so
   * structural noise (undefined values, invalid columns, key order) is
   * ignored.
   *
   * Returns `true` when no baseline has been set yet (safe default:
   * assume the state has changed).
   */
  public hasChangedFromBaseline(
    currentState: CustomGridState,
    validColIds: Set<string>,
  ): boolean {
    if (this.baseline === null) {
      return true;
    }
    return !areGridStatesEqual(this.baseline, currentState, validColIds);
  }
}
