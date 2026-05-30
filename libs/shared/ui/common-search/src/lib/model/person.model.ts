/**
 * Local stub interfaces replacing proprietary @fmr-pr000539/eqt-ngrx-refdata-services-module
 * Person-related types used by PersonSearchService, TeamSearchService, TraderTeamSearchService
 */

export interface Person {
  personId: number;
  corpId: string;
  firstName: string;
  lastName: string;
  initials: string;
  reportingName: string;
  [key: string]: unknown;
}

export interface Team {
  shortName: string;
  longName: string;
  [key: string]: unknown;
}

export interface PersonServiceTraderResponse {
  persons: Person[];
}

export interface PersonServiceTeamsResponse {
  teams: Team[];
}

/** Stub PersonService - implement with real HTTP calls in production */
export abstract class PersonService {
  abstract getTraders(): import('rxjs').Observable<PersonServiceTraderResponse>;
  abstract getPortfolioManagers(
    equityType: string,
    includeInactive: boolean,
  ): import('rxjs').Observable<PersonServiceTraderResponse>;
  abstract getTeams(): import('rxjs').Observable<PersonServiceTeamsResponse>;
}
