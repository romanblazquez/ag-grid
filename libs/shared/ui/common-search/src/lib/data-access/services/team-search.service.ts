import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import {
  PersonService,
  PersonServiceTeamsResponse,
  Team,
} from '../../model/person.model';
import { HttpClient } from '@angular/common/http';
import { PreferenceService } from './preference.service';
import { Context } from '../../model/context.model';
import { map, Observable, tap } from 'rxjs';
import { bestMatchSortFn } from '../../util/sorting-util';

@Injectable()
export class TeamSearchService extends SearchService<Team> {
  public constructor(
    private readonly http: HttpClient,
    private readonly preferenceService: PreferenceService,
    private readonly personService: PersonService,
  ) {
    super();
  }

  public search(query: string, serviceContext: Context): Observable<Team[]> {
    const dataPool = this.persistedData$.value.length
      ? this.persistedData$
      : this.getTeams().pipe(
          map(
            (teamsResponse: PersonServiceTeamsResponse) => teamsResponse.teams,
          ),
        );
    const filterMethod = serviceContext.multiselect
      ? this.filterByQueryMultiselect
      : this.filterByQuerySingleSelect;
    return dataPool.pipe(
      map((teams) =>
        filterMethod(teams, query, [
          (team) => team.shortName,
          (team) => team.longName,
        ]).sort(bestMatchSortFn(query, (team) => team.shortName)),
      ),
    );
  }

  public loadInitialData(): Observable<any> {
    return this.getTeams().pipe(
      map((teamsResponse: PersonServiceTeamsResponse) => teamsResponse.teams),
      tap((teams: Team[]) => this.persistedData$.next(teams)),
    );
  }

  public getTeams(): Observable<PersonServiceTeamsResponse> {
    return this.personService.getTeams();
  }

  public override getInitialData(serviceContext: Context): Observable<Team[]> {
    return this.preferenceService.getPreference<Team>(
      serviceContext.emitField,
      serviceContext.preferenceContext,
      this.persistedData$,
    );
  }
}
