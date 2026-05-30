/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { combineLatest, map, Observable, tap, of } from 'rxjs';
import {
  PersonService,
  PersonServiceTraderResponse,
  PersonServiceTeamsResponse,
} from '../../model/person.model';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';
import { PreferenceService } from './preference.service';
import { bestMatchSortFn } from '../../util/sorting-util';

/**
 * Unified search service that combines trader and team data into a single searchable list.
 * Returns raw Person and Team objects with type indicators for the UI to handle.
 */
@Injectable()
export class TraderTeamSearchService extends SearchService<any> {
  public constructor(
    private readonly http: HttpClient,
    private readonly preferenceService: PreferenceService,
    private readonly personService: PersonService,
  ) {
    super();
  }

  /**
   * Searches through combined trader and team data.
   * Returns raw objects with type indicators for the common-search framework.
   *
   * @param query - Search query string
   * @param serviceContext - Search configuration context
   * @returns Observable of filtered combined data array
   */
  public search(query: string, serviceContext: Context): Observable<any[]> {
    const dataPool = this.persistedData$.value.length
      ? this.persistedData$
      : this.loadCombinedData();

    const filterMethod = serviceContext.multiselect
      ? this.filterByQueryMultiselect
      : this.filterByQuerySingleSelect;

    return dataPool.pipe(
      map((items) =>
        filterMethod(items, query, [
          (item) =>
            item.displayName ||
            item.initials ||
            item.shortName ||
            item.firstName ||
            item.lastName,
          (item) => item.fullName || item.reportingName || item.longName,
        ]).sort(
          bestMatchSortFn(
            query,
            (item) =>
              item.displayName ||
              item.initials ||
              item.shortName ||
              item.firstName ||
              item.lastName,
          ),
        ),
      ),
    );
  }

  /**
   * Loads initial combined data from both traders and teams services.
   * Uses combineLatest to efficiently combine both data streams.
   *
   * @returns Observable of combined data
   */
  public loadInitialData(): Observable<any[]> {
    return this.loadCombinedData().pipe(
      tap((items: any[]) => this.persistedData$.next(items)),
    );
  }

  /**
   * Gets initial data for preferences functionality.
   * Since TraderTeam is a unified view, we return the full persisted dataset.
   *
   * @param serviceContext - Context containing preference configuration
   * @returns Observable of full combined data array
   */
  public override getInitialData(serviceContext: Context): Observable<any[]> {
    // TraderTeam doesn't use preferences - always return full dataset
    return this.persistedData$.asObservable();
  }

  /**
   * Loads and combines data from both traders and teams endpoints.
   * This method implements the core business logic for unifying the data sources.
   * Returns raw objects with additional type indicator fields.
   *
   * @private
   * @returns Observable of combined data array
   */
  private loadCombinedData(): Observable<any[]> {
    const traders$ = this.personService.getTraders().pipe(
      map((response: PersonServiceTraderResponse) =>
        response.persons.map((person) => ({
          ...person,
          itemType: 'trader',
          displayName: person.initials || '',
          fullName: person.reportingName,
          id: person.personId,
        })),
      ),
    );

    const teams$ = this.personService.getTeams().pipe(
      map((response: PersonServiceTeamsResponse) =>
        response.teams.map((team) => ({
          ...team,
          itemType: 'team',
          displayName: team.shortName || '',
          fullName: team.longName,
          id: team.shortName,
        })),
      ),
    );

    return combineLatest([traders$, teams$]).pipe(
      map(([traders, teams]) => {
        // Combine and sort: traders first, then teams, both alphabetically
        const sortedTraders = traders.sort((a, b) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        );
        const sortedTeams = teams.sort((a, b) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        );

        return [...sortedTraders, ...sortedTeams];
      }),
    );
  }

  /**
   * Direct access to traders data for backward compatibility.
   * @deprecated Use loadCombinedData() instead for unified access
   */
  public getTraders(): Observable<PersonServiceTraderResponse> {
    return this.personService.getTraders();
  }

  /**
   * Direct access to teams data for backward compatibility.
   * @deprecated Use loadCombinedData() instead for unified access
   */
  public getTeams(): Observable<PersonServiceTeamsResponse> {
    return this.personService.getTeams();
  }
}
