import { areGridStatesEqual, sanitizeGridState } from './grid-state.utils';
import { CustomGridState } from './gridState';

const COLS = new Set(['col1', 'col2', 'col3']);

const base: CustomGridState = {
  sort: { sortModel: [{ colId: 'col1', sort: 'asc' }] },
  columnOrder: { orderedColIds: ['col1', 'col2', 'col3'] },
  columnPinning: { leftColIds: ['col1'], rightColIds: [] },
  columnVisibility: { hiddenColIds: [] },
  filter: { filterModel: {} },
  pagination: { page: 0 },
  expandAll: false,
};

describe('areGridStatesEqual', () => {
  it('returns true for identical states', () => {
    expect(areGridStatesEqual(base, { ...base }, COLS)).toBe(true);
  });

  it('returns true for deep-equal states', () => {
    const a = structuredClone(base);
    const b = structuredClone(base);
    expect(areGridStatesEqual(a, b, COLS)).toBe(true);
  });

  it('returns false when sort differs', () => {
    const b = structuredClone(base);
    b.sort = { sortModel: [{ colId: 'col2', sort: 'desc' }] };
    expect(areGridStatesEqual(base, b, COLS)).toBe(false);
  });

  it('returns false when column order differs', () => {
    const b = structuredClone(base);
    b.columnOrder = { orderedColIds: ['col2', 'col1', 'col3'] };
    expect(areGridStatesEqual(base, b, COLS)).toBe(false);
  });

  it('returns true when both states have the same columns after sanitization', () => {
    // a has an invalid col that sanitize removes
    const a: CustomGridState = {
      ...base,
      sort: {
        sortModel: [
          { colId: 'col1', sort: 'asc' },
          { colId: 'INVALID_COL', sort: 'asc' },
        ],
      },
    };
    const b: CustomGridState = {
      ...base,
      sort: { sortModel: [{ colId: 'col1', sort: 'asc' }] },
    };
    expect(areGridStatesEqual(a, b, COLS)).toBe(true);
  });

  it('ignores object key ordering differences', () => {
    // Construct a and b with same values but different key insertion order
    const a: CustomGridState = { expandAll: false, sort: { sortModel: [] } };
    const b: CustomGridState = { sort: { sortModel: [] }, expandAll: false };
    expect(areGridStatesEqual(a, b, COLS)).toBe(true);
  });

  it('returns false when filter models differ', () => {
    const a: CustomGridState = {
      filter: { filterModel: { col1: { type: 'equals', filter: 'X' } } },
    };
    const b: CustomGridState = { filter: { filterModel: {} } };
    expect(areGridStatesEqual(a, b, COLS)).toBe(false);
  });

  it('treats filter on invalid column as equal to empty filter (sanitized away)', () => {
    const a: CustomGridState = {
      filter: { filterModel: { INVALID: { type: 'equals', filter: 'X' } } },
    };
    const b: CustomGridState = { filter: { filterModel: {} } };
    expect(areGridStatesEqual(a, b, COLS)).toBe(true);
  });

  it('returns true when expandAll defaults are applied by sanitize', () => {
    // sanitizeGridState sets expandAll = false when missing
    const a: CustomGridState = {};
    const b: CustomGridState = { expandAll: false };
    expect(areGridStatesEqual(a, b, COLS)).toBe(true);
  });

  it('handles empty column sets gracefully', () => {
    const emptyCols = new Set<string>();
    const a: CustomGridState = {
      columnOrder: { orderedColIds: ['col1', 'col2'] },
    };
    const b: CustomGridState = {
      columnOrder: { orderedColIds: ['col2', 'col1'] },
    };
    // Both get sanitized to [] against empty colIds set → equal
    expect(areGridStatesEqual(a, b, emptyCols)).toBe(true);
  });
});

describe('sanitizeGridState', () => {
  it('removes invalid column ids from sortModel', () => {
    const state: CustomGridState = {
      sort: {
        sortModel: [
          { colId: 'col1', sort: 'asc' },
          { colId: 'INVALID', sort: 'asc' },
        ],
      },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.sort?.sortModel).toHaveLength(1);
    expect((result.sort?.sortModel?.[0] as { colId: string }).colId).toBe(
      'col1',
    );
  });

  it('removes invalid column ids from columnOrder', () => {
    const state: CustomGridState = {
      columnOrder: { orderedColIds: ['col1', 'INVALID', 'col2'] },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.columnOrder?.orderedColIds).toEqual(['col1', 'col2']);
  });

  it('removes invalid colIds from filter model', () => {
    const state: CustomGridState = {
      filter: {
        filterModel: { col1: { type: 'equals' }, INVALID: { type: 'equals' } },
      },
    };
    const result = sanitizeGridState(state, COLS);
    expect(Object.keys(result.filter?.filterModel ?? {})).toEqual(['col1']);
  });

  it('preserves auto-column filters in filter model', () => {
    const state: CustomGridState = {
      filter: {
        filterModel: {
          col1: { type: 'equals', filter: 'X' },
          'ag-Grid-AutoColumn-ticker': { type: 'equals', filter: 'ABC' },
        },
      },
    };
    const result = sanitizeGridState(state, COLS);
    expect(Object.keys(result.filter?.filterModel ?? {})).toContain(
      'ag-Grid-AutoColumn-ticker',
    );
    expect(Object.keys(result.filter?.filterModel ?? {})).toContain('col1');
  });

  it('preserves multiple auto-column filters when grouping is active', () => {
    const state: CustomGridState = {
      filter: {
        filterModel: {
          'ag-Grid-AutoColumn-fund': { type: 'contains', filter: 'EQ' },
          'ag-Grid-AutoColumn-broker': { type: 'equals', filter: 'ML' },
          INVALID: { type: 'equals' },
        },
      },
    };
    const result = sanitizeGridState(state, COLS);
    const keys = Object.keys(result.filter?.filterModel ?? {});
    expect(keys).toContain('ag-Grid-AutoColumn-fund');
    expect(keys).toContain('ag-Grid-AutoColumn-broker');
    expect(keys).not.toContain('INVALID');
  });

  it('removes invalid colIds from pinning', () => {
    const state: CustomGridState = {
      columnPinning: {
        leftColIds: ['col1', 'INVALID'],
        rightColIds: ['col2', 'BAD'],
      },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.columnPinning?.leftColIds).toEqual(['col1']);
    expect(result.columnPinning?.rightColIds).toEqual(['col2']);
  });

  it('ensures expandAll defaults to false when undefined', () => {
    const result = sanitizeGridState({}, COLS);
    expect(result.expandAll).toBe(false);
  });

  it('removes invalid pagination values', () => {
    const state: CustomGridState = {
      pagination: { page: -1, pageSize: -5 },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.pagination?.page).toBeUndefined();
    expect(result.pagination?.pageSize).toBeUndefined();
  });

  it('removes invalid sidebar position', () => {
    const state: CustomGridState = {
      sideBar: { visible: true, position: 'INVALID' as any },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.sideBar?.position).toBeUndefined();
  });

  it('removes null entries from sortModel', () => {
    const state: CustomGridState = {
      sort: { sortModel: [{ colId: 'col1', sort: 'asc' }, null as any] },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.sort?.sortModel).toHaveLength(1);
    expect((result.sort?.sortModel?.[0] as { colId: string }).colId).toBe(
      'col1',
    );
  });

  it('removes null entries from columnSizingModel', () => {
    const state: CustomGridState = {
      columnSizing: {
        columnSizingModel: [null as any, { colId: 'col2', width: 100 }],
      },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.columnSizing?.columnSizingModel).toHaveLength(1);
  });

  it('removes null entries from orderedColIds', () => {
    const state: CustomGridState = {
      columnOrder: { orderedColIds: ['col1', null as any, 'col2'] },
    };
    const result = sanitizeGridState(state, COLS);
    expect(result.columnOrder?.orderedColIds).toEqual(['col1', 'col2']);
  });

  it('does not mutate the input state', () => {
    const state: CustomGridState = {
      sort: { sortModel: [{ colId: 'col1', sort: 'asc' }] },
    };
    const frozen = structuredClone(state);
    sanitizeGridState(state, COLS);
    expect(state).toEqual(frozen);
  });
});
