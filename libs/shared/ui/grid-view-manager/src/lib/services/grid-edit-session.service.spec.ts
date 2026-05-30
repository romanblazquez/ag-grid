import { GridEditSessionService } from './grid-edit-session.service';
import { CustomGridState } from '../data-access/grid-state/grid-state.utils';

const COLS = new Set(['col1', 'col2', 'col3']);

const stateA: CustomGridState = {
  sort: { sortModel: [{ colId: 'col1', sort: 'asc' }] },
  columnOrder: { orderedColIds: ['col1', 'col2', 'col3'] },
  expandAll: false,
};

const stateB: CustomGridState = {
  sort: { sortModel: [{ colId: 'col2', sort: 'desc' }] },
  columnOrder: { orderedColIds: ['col2', 'col1', 'col3'] },
  expandAll: false,
};

describe('GridEditSessionService', () => {
  let service: GridEditSessionService;

  beforeEach(() => {
    service = new GridEditSessionService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Origin gate ────────────────────────────────────────────────────────

  describe('isUserChange / suppressChanges', () => {
    it('defaults to view-apply on construction (origin not user)', () => {
      // Service starts suppressed so startup AG Grid events are blocked
      expect(service.isUserChange()).toBe(false);
    });

    it('returns true after suppression tail expires', () => {
      service.suppressChanges(() => {});
      expect(service.isUserChange()).toBe(false);
      jest.advanceTimersByTime(250);
      expect(service.isUserChange()).toBe(true);
    });

    it('is false while suppressChanges fn is executing', () => {
      let duringFn = true;
      service.suppressChanges(() => {
        duringFn = service.isUserChange();
      });
      expect(duringFn).toBe(false);
    });

    it('is false during the suppression tail (< 250ms after fn returns)', () => {
      service.suppressChanges(() => {});
      jest.advanceTimersByTime(249);
      expect(service.isUserChange()).toBe(false);
    });

    it('resets the tail timer when suppression starts during an active tail', () => {
      service.suppressChanges(() => {});
      jest.advanceTimersByTime(200); // inside first tail
      service.suppressChanges(() => {}); // restart
      jest.advanceTimersByTime(200); // would expire first, but timer was reset
      expect(service.isUserChange()).toBe(false);
      jest.advanceTimersByTime(50); // now 250ms from second call
      expect(service.isUserChange()).toBe(true);
    });

    it('catches errors in fn and still schedules the tail release', () => {
      expect(() =>
        service.suppressChanges(() => {
          throw new Error('boom');
        }),
      ).toThrow();
      jest.advanceTimersByTime(250);
      expect(service.isUserChange()).toBe(true);
    });
  });

  describe('isSuppressing', () => {
    it('returns true immediately after suppressChanges called', () => {
      service.suppressChanges(() => {});
      expect(service.isSuppressing()).toBe(true);
    });

    it('returns false once tail expires', () => {
      service.suppressChanges(() => {});
      jest.advanceTimersByTime(250);
      expect(service.isSuppressing()).toBe(false);
    });
  });

  // ── Baseline ───────────────────────────────────────────────────────────

  describe('commitBaseline / hasChangedFromBaseline', () => {
    it('returns true when no baseline has been committed yet', () => {
      expect(service.hasChangedFromBaseline(stateA, COLS)).toBe(true);
    });

    it('returns false when current state equals committed baseline', () => {
      service.commitBaseline(stateA, COLS);
      expect(
        service.hasChangedFromBaseline(structuredClone(stateA), COLS),
      ).toBe(false);
    });

    it('returns true when current state differs from baseline', () => {
      service.commitBaseline(stateA, COLS);
      expect(service.hasChangedFromBaseline(stateB, COLS)).toBe(true);
    });

    it('returns false after re-committing new baseline matching current state', () => {
      service.commitBaseline(stateA, COLS);
      service.commitBaseline(stateB, COLS);
      expect(
        service.hasChangedFromBaseline(structuredClone(stateB), COLS),
      ).toBe(false);
    });

    it('ignores invalid column ids in baseline comparison', () => {
      const withInvalid: CustomGridState = {
        ...stateA,
        sort: {
          sortModel: [
            { colId: 'col1', sort: 'asc' },
            { colId: 'INVALID', sort: 'asc' },
          ],
        },
      };
      service.commitBaseline(withInvalid, COLS);
      // INVALID col is stripped by sanitize — should equal stateA
      expect(service.hasChangedFromBaseline(stateA, COLS)).toBe(false);
    });

    it('does not mutate the state passed to commitBaseline', () => {
      const original = JSON.parse(JSON.stringify(stateA)) as typeof stateA;
      service.commitBaseline(stateA, COLS);
      expect(stateA).toEqual(original);
    });
  });
});
