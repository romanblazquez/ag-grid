import { Injectable, signal, effect } from '@angular/core';
import { Observable, of } from 'rxjs';

export type IprefsKey = string;

/**
 * Iprefs (interaction preferences) — stores the last-N items the user
 * picked from a search panel, keyed by search type.
 *
 * Signals-based, not NgRx: the data model is a simple keyed dictionary
 * with no async coordination, no time-travel needs, and no cross-feature
 * subscribers — NgRx Store + Actions + Reducers + Selectors + Effects
 * would be ~150 lines of boilerplate for a `Map`. The signal API is the
 * project's existing convention (PersonCacheService, DataAccessFacadeService).
 *
 * Persistence: writes to localStorage on every change via `effect()`.
 * Read on construction so iprefs survive page refresh.
 */
@Injectable({ providedIn: 'root' })
export class IprefsService {
  private static readonly STORAGE_KEY = 'trade-platform.iprefs';
  private static readonly VERSION_KEY = 'trade-platform.iprefs.version';
  /** Bump this when the saved shape changes — stale entries are wiped. */
  private static readonly SCHEMA_VERSION = '2';
  private static readonly MAX_PER_KEY = 5;

  private readonly _saved = signal<Record<IprefsKey, unknown[]>>(
    this.loadFromStorage(),
  );

  /** Reactive read of all iprefs. */
  readonly saved = this._saved.asReadonly();

  constructor() {
    effect(() => {
      const data = this._saved();
      try {
        localStorage.setItem(IprefsService.STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore quota / private-mode errors
      }
    });
  }

  /** Get iprefs as an Observable (drop-in for `initialDataFn` on SearchContext). */
  get$<T>(key: IprefsKey): Observable<T[]> {
    return of(this.get<T>(key));
  }

  /** Get iprefs synchronously. */
  get<T>(key: IprefsKey): T[] {
    return (this._saved()[key] ?? []) as T[];
  }

  /**
   * Add an item to the front of the list, deduped, capped at MAX_PER_KEY.
   * Pass `idField` to dedupe by a specific field; otherwise full-object equality.
   */
  add<T>(key: IprefsKey, item: T, idField?: keyof T): void {
    this._saved.update((all) => {
      const existing = (all[key] ?? []) as T[];
      const filtered = idField
        ? existing.filter((i) => i[idField] !== item[idField])
        : existing.filter((i) => JSON.stringify(i) !== JSON.stringify(item));
      const next = [item, ...filtered].slice(0, IprefsService.MAX_PER_KEY);
      return { ...all, [key]: next as unknown[] };
    });
  }

  /** Replace iprefs for a key wholesale (useful for seeding from a remote source). */
  set<T>(key: IprefsKey, items: T[]): void {
    this._saved.update((all) => ({
      ...all,
      [key]: items.slice(0, IprefsService.MAX_PER_KEY) as unknown[],
    }));
  }

  /** Clear iprefs for one key. */
  clear(key: IprefsKey): void {
    this._saved.update((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });
  }

  /** Clear all iprefs. */
  clearAll(): void {
    this._saved.set({});
  }

  private loadFromStorage(): Record<IprefsKey, unknown[]> {
    try {
      // Wipe stale entries when the schema version changes — older saves
      // may hold IDs instead of full records (e.g. from initLoadData:true
      // configs that emitted selection.values rather than selection.data).
      const version = localStorage.getItem(IprefsService.VERSION_KEY);
      if (version !== IprefsService.SCHEMA_VERSION) {
        localStorage.removeItem(IprefsService.STORAGE_KEY);
        localStorage.setItem(
          IprefsService.VERSION_KEY,
          IprefsService.SCHEMA_VERSION,
        );
        return {};
      }
      const raw = localStorage.getItem(IprefsService.STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return {};
      // Defensive: drop any keys whose values are not arrays of OBJECTS.
      // If iprefs hold primitives (IDs only) the grid view can't render
      // detail fields off them — surface as empty and let new selects
      // re-populate with full records.
      const cleaned: Record<IprefsKey, unknown[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value)) continue;
        const objectsOnly = value.filter(
          (item) => item !== null && typeof item === 'object',
        );
        if (objectsOnly.length > 0) cleaned[key] = objectsOnly;
      }
      return cleaned;
    } catch {
      return {};
    }
  }
}
