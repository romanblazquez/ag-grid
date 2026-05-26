import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import { AbstractData } from '../../model/search-result.model';
import { SearchService } from './search.service';
import { bestMatchSortFn } from '../../util/sorting-util';
import { DataAccessFacadeService } from '../data-access-facade.service';

export const PERSON_SERVICE_URL = new InjectionToken<string>(
  'PERSON_SERVICE_URL',
);

export interface Person {
  personSourceId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  desk: string;
  corpId?: string;
  [key: string]: unknown;
}

interface PersonServiceResponse {
  persons: Person[];
}

@Injectable()
export class PersonSearchService extends SearchService<Person> {
  override persistedData$: BehaviorSubject<Person[]> = new BehaviorSubject<
    Person[]
  >([]);

  private readonly http = inject(HttpClient);
  private readonly url = inject(PERSON_SERVICE_URL, { optional: true });
  private readonly dataCache = inject(DataAccessFacadeService);

  search(query: string): Observable<Person[]> {
    return this.getAllPersons().pipe(
      map((persons) =>
        this.filterByQueryMultiselect(persons, query, [
          (p) => p.fullName,
          (p) => p.firstName ?? '',
          (p) => p.lastName ?? '',
          (p) => p.corpId ?? '',
        ]).sort(bestMatchSortFn(query, (p) => p.fullName)),
      ),
    );
  }

  loadInitialData(): Observable<Person[]> {
    return this.getAllPersons().pipe(
      tap((persons) => this.persistedData$.next(persons)),
    );
  }

  getInitialData(): Observable<Person[]> {
    const cachedValues = this.dataCache.getPreference<unknown>('trader');
    if (!cachedValues.length) {
      return this.search('');
    }

    const persisted = this.persistedData$.value;
    if (persisted.length > 0) {
      return of(
        this.dataCache.getPreference<Person>(
          'trader',
          persisted,
          'personSourceId',
        ),
      );
    }

    return this.loadInitialData().pipe(
      map(() =>
        this.dataCache.getPreference<Person>(
          'trader',
          this.persistedData$.value,
          'personSourceId',
        ),
      ),
    );
  }

  getAllPersons(): Observable<Person[]> {
    if (!this.url) return of([]);
    return this.http
      .get<PersonServiceResponse>(`${this.url}/traders`)
      .pipe(map((res) => res.persons ?? []));
  }

  toDataSourceFn() {
    return (query: string): Observable<AbstractData[]> =>
      query ? this.search(query) : this.getInitialData();
  }
}
