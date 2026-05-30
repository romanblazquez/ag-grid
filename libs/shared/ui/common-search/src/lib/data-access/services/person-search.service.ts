import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, mergeMap, Observable, tap } from 'rxjs';
import { PersonCacheService, PersonRecord } from '@trade-platform/shared/data-access';
import { Person } from '../../model/person.model';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';
import { PreferenceService } from './preference.service';
import { bestMatchSortFn } from '../../util/sorting-util';
import { ApiName, ServiceConfig } from '../../model/service-config.model';
import { svcConfig } from '../../model/external-services.constant';

/** Shape returned by GET /api/persons/traders */
interface MockPersonsResponse {
  persons?: MockPerson[];
}

interface MockPerson {
  personSourceId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  desk?: string;
  corpId?: string;
  initials?: string;
  reportingName?: string;
  [key: string]: unknown;
}

@Injectable()
export class PersonSearchService extends SearchService<Person> {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;
  public override persistedData$: BehaviorSubject<Person[]> = new BehaviorSubject<Person[]>([]);

  public constructor(
    private readonly http: HttpClient,
    private readonly preferenceService: PreferenceService,
    private readonly personCacheService: PersonCacheService,
  ) {
    super();
  }

  public search(query: string, serviceContext: Context): Observable<Person[]> {
    const dataPool: Observable<Person[]> = this.persistedData$.value.length
      ? this.persistedData$.asObservable()
      : this.getTraders();

    const filterMethod = serviceContext.multiselect
      ? this.filterByQueryMultiselect
      : this.filterByQuerySingleSelect;

    return dataPool.pipe(
      map((persons) =>
        filterMethod(persons, query, [
          (person) => person.firstName,
          (person) => person.lastName,
          (person) => person.corpId,
          (person) => person.initials,
          (person) => person.reportingName,
        ]).sort(bestMatchSortFn(query, (person) => person.reportingName)),
      ),
    );
  }

  public loadInitialData(context?: Context): Observable<Person[]> {
    return this.getTraders().pipe(
      tap((persons) => {
        this.personCacheService.setPersons(this.toPersonRecords(persons));
        this.persistedData$.next(persons);
      }),
    );
  }

  public getTraders(): Observable<Person[]> {
    return this.apiRecord.GetTraders.url.pipe(
      mergeMap((url) =>
        this.http.get<MockPersonsResponse>(url).pipe(
          map((res) => this.normaliseMockPersons(res.persons ?? [])),
        ),
      ),
    );
  }

  public override getInitialData(serviceContext: Context): Observable<Person[]> {
    return this.preferenceService.getPreference<Person>(
      serviceContext.emitField,
      serviceContext.preferenceContext,
      this.persistedData$,
    );
  }

  private normaliseMockPersons(raw: MockPerson[]): Person[] {
    return raw.map((p, i) => {
      const firstName = p.firstName ?? '';
      const lastName = p.lastName ?? '';
      const initials =
        p.initials ??
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
      const reportingName = p.reportingName ?? p.fullName ?? `${firstName} ${lastName}`.trim();
      const corpId = p.corpId ?? p.personSourceId ?? '';
      return {
        ...p,
        personId: i,
        corpId,
        firstName,
        lastName,
        initials,
        reportingName,
      } as Person;
    });
  }

  private toPersonRecords(persons: Person[]): PersonRecord[] {
    return persons.map((p) => ({
      sourceId: p.corpId,
      fullName: p.reportingName ?? `${p.firstName} ${p.lastName}`.trim(),
      initials: p.initials,
    }));
  }
}
