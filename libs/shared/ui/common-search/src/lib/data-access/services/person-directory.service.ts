import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, mergeMap } from 'rxjs';
import {
  Person,
  PersonService,
  PersonServiceTeamsResponse,
  PersonServiceTraderResponse,
  Team,
} from '../../model/person.model';
import { ApiName, ServiceConfig } from '../../model/service-config.model';
import { svcConfig } from '../../model/external-services.constant';

interface MockPersonResponse {
  persons?: Record<string, unknown>[];
  teams?: Record<string, unknown>[];
}

@Injectable()
export class PersonDirectoryService extends PersonService {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;

  public constructor(private readonly http: HttpClient) {
    super();
  }

  public getTraders(): Observable<PersonServiceTraderResponse> {
    return this.fetchPeople(this.apiRecord.GetTraders.url).pipe(
      map((persons) => ({
        persons: persons.map((person, index) => this.normalizePerson(person, index)),
      })),
    );
  }

  public getPortfolioManagers(
    _equityType: string,
    _includeInactive: boolean,
  ): Observable<PersonServiceTraderResponse> {
    return this.fetchPeople(this.apiRecord.GetPMs.url).pipe(
      map((persons) => ({
        persons: persons.map((person, index) => this.normalizePerson(person, index)),
      })),
    );
  }

  public getTeams(): Observable<PersonServiceTeamsResponse> {
    return this.fetchTeamRows(this.apiRecord.GetTeams.url).pipe(
      map((teams) => ({
        teams: teams.map((team, index) => this.normalizeTeam(team, index)),
      })),
    );
  }

  private fetchPeople(url$: Observable<string>): Observable<Record<string, unknown>[]> {
    return url$.pipe(
      mergeMap((url) =>
        this.http.get<MockPersonResponse>(url).pipe(
          map((response) => response.persons ?? response.teams ?? []),
        ),
      ),
    );
  }

  private fetchTeamRows(url$: Observable<string>): Observable<Record<string, unknown>[]> {
    return url$.pipe(
      mergeMap((url) =>
        this.http.get<MockPersonResponse>(url).pipe(
          map((response) => response.teams ?? response.persons ?? []),
        ),
      ),
    );
  }

  private normalizePerson(
    raw: Record<string, unknown>,
    index: number,
  ): Person {
    const firstName = `${raw['firstName'] ?? ''}`.trim();
    const lastName = `${raw['lastName'] ?? ''}`.trim();
    const initials = `${raw['initials'] ?? `${firstName.charAt(0)}${lastName.charAt(0)}`}`.trim().toUpperCase();
    const reportingName = `${raw['reportingName'] ?? raw['fullName'] ?? `${firstName} ${lastName}`}`.trim();
    const corpId = `${raw['corpId'] ?? raw['personSourceId'] ?? raw['id'] ?? ''}`.trim();

    return {
      ...raw,
      personId: Number(raw['personId'] ?? raw['id'] ?? index),
      corpId,
      firstName,
      lastName,
      initials,
      reportingName,
    } as Person;
  }

  private normalizeTeam(raw: Record<string, unknown>, index: number): Team {
    const shortName = `${raw['shortName'] ?? raw['initials'] ?? raw['teamCode'] ?? raw['corpId'] ?? raw['id'] ?? ''}`.trim();
    const fallbackLongName = shortName || `Team ${index + 1}`;
    const longName = `${raw['longName'] ?? raw['reportingName'] ?? raw['fullName'] ?? fallbackLongName}`.trim();

    return {
      ...raw,
      shortName,
      longName,
    } as Team;
  }
}
