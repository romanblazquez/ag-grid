import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export abstract class SearchService<T> {
  persistedData$: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([]);

  abstract search(query: string): Observable<T[]>;
  abstract loadInitialData(): Observable<unknown>;
  abstract getInitialData(): Observable<T[]>;

  filterByQueryMultiselect<E>(
    entities: E[],
    query: string,
    fieldGetters: Array<(entity: E) => string>,
  ): E[] {
    if (!query) return entities;
    const terms = query
      .split(',')
      .map((q) => q.trim().toLowerCase())
      .filter(Boolean);
    return entities.filter((entity) =>
      terms.some((term) =>
        fieldGetters.some((getter) => {
          const val = getter(entity);
          if (!val) return false;
          const isMulti = terms.length > 1;
          return isMulti
            ? val.toLowerCase() === term
            : val.toLowerCase().includes(term);
        }),
      ),
    );
  }

  filterByQuerySingleSelect<E>(
    entities: E[],
    query: string,
    fieldGetters: Array<(entity: E) => string>,
  ): E[] {
    if (!query) return entities;
    return entities.filter((entity) =>
      fieldGetters.some((getter) => {
        const val = getter(entity);
        return val?.toLowerCase().includes(query.toLowerCase()) ?? false;
      }),
    );
  }
}
