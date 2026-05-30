import { Injectable } from '@angular/core';
import { SearchType } from '../model/search-type.model';
import { Context } from '../model/context.model';
import { externalServices } from '../model/external-services.constant';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { PortfolioService } from './services/portfolio.service';
import { BrokersService } from './services/broker.service';
import { SearchContext } from '../model/search-context.model';
import { SearchService } from './services/search.service';
import { ParentBrokerSearchService } from './services/parent-broker-search.service';
import { PreferenceService, TreePrefNode } from './services/preference.service';
import { CodeValueService } from './services/codevalue.service';
import { SecurityService } from './services/security.service';
import { PersonSearchService } from './services/person-search.service';
import { TeamSearchService } from './services/team-search.service';
import { TraderTeamSearchService } from './services/trader-team-search.service';

@Injectable()
export class DataAccessFacadeService {
  public serviceRecord: Record<SearchType, Context> = externalServices;
  public initialDataPersisted$ = new BehaviorSubject(false);

  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly brokerService: BrokersService,
    private readonly parentBrokerService: ParentBrokerSearchService,
    private readonly preferenceService: PreferenceService,
    private readonly codeValueService: CodeValueService,
    private readonly securityService: SecurityService,
    private readonly personService: PersonSearchService,
    private readonly teamService: TeamSearchService,
    private readonly traderTeamService: TraderTeamSearchService,
  ) {}

  public loadPreferences(searchContext: SearchContext): void {
    const serviceContext = this.getServiceContext(searchContext.searchType);
    // Only load preferences if preferenceContext is defined
    if (serviceContext.preferenceContext) {
      this.preferenceService.requestAllPreferences(
        serviceContext.preferenceContext,
      );
    }
  }

  public getServiceContext(searchtype: SearchType): Context {
    return this.serviceRecord[searchtype];
  }

  public loadInitialData(searchContext: SearchContext): Observable<any> {
    const searchService = this.getSearchService(searchContext.searchType);
    const context = this.getServiceContext(searchContext.searchType);
    return searchService
      .loadInitialData(context)
      .pipe(tap(() => this.initialDataPersisted$.next(true)));
  }

  public getSuggestedData(
    context: Context,
    searchType: SearchType,
    query: string,
  ): Observable<any[]> {
    const searchService = this.getSearchService(searchType);
    return searchService.search(query, context);
  }

  public getInitialData(
    context: Context,
    searchType: SearchType,
  ): Observable<any[]> {
    const searchService = this.getSearchService(searchType);
    return searchService.getInitialData(context);
  }

  public setPreference(
    searchContext: SearchContext,
    value: any[],
    isTreeView: boolean | undefined,
  ): void {
    const serviceContext = this.getServiceContext(searchContext.searchType);
    if (isTreeView) {
      this.preferenceService.setTreePreference(
        serviceContext.preferenceContext,
        value as unknown[] as TreePrefNode[],
      );
    } else if (serviceContext.preferenceContext) {
      this.preferenceService.setPreference(
        serviceContext.preferenceContext,
        value,
      );
    }
  }

  private getSearchService(searchType: SearchType): SearchService<any> {
    switch (searchType) {
      case SearchType.FundPm:
        return this.portfolioService;
      case SearchType.Broker:
        return this.brokerService;
      case SearchType.ParentBroker:
        return this.parentBrokerService;
      case SearchType.InstrumentType:
        return this.codeValueService;
      case SearchType.Symbol:
        return this.securityService;
      case SearchType.Trader:
        return this.personService;
      case SearchType.Team:
        return this.teamService;
      case SearchType.TraderTeam:
        return this.traderTeamService;
      case SearchType.PmAndTraders:
        return this.personService;
      case SearchType.StructureType:
        return this.codeValueService;
    }
  }
}
