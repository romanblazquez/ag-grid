import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PreferenceService {
  private readonly store = new Map<string, unknown[]>();

  requestAllPreferences(_key: string): void {
    // no-op: in-memory mode has no remote preference store
  }

  setPreference(key: string, value: unknown[], limit = 10): void {
    const existing = this.store.get(key) ?? [];
    const deduped = [...value, ...existing].filter(
      (item, idx, arr) =>
        arr.findIndex((a) => JSON.stringify(a) === JSON.stringify(item)) === idx,
    );
    this.store.set(key, deduped.slice(0, limit));
  }

  getPreference<T>(key: string): Observable<T[]> {
    return of((this.store.get(key) ?? []) as T[]);
  }
}
