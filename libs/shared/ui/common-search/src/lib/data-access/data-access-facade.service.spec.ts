import { TestBed } from '@angular/core/testing';
import { StoreModule } from '@ngrx/store';
import { SearchType } from '../model/search-type.model';
import { PortfolioService } from './services/portfolio.service';
import { BrokersService } from './services/broker.service';
import { CodeValueService } from './services/codevalue.service';
import { DataAccessFacadeService } from './data-access-facade.service';
import { SearchContext } from '../model/search-context.model';
import { of } from 'rxjs';
import { ParentBrokerSearchService } from './services/parent-broker-search.service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { SecurityService } from './services/security.service';
import { PersonSearchService } from './services/person-search.service';
import { TeamSearchService } from './services/team-search.service';
import { TraderTeamSearchService } from './services/trader-team-search.service';

describe('DataAccessFacadeService', () => {
  let service: DataAccessFacadeService;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  let mockBrokerService: jest.Mocked<BrokersService>;
  let mockCodeValueService: jest.Mocked<CodeValueService>;
  let mockSecurityService: jest.Mocked<SecurityService>;
  let mockParentBrokerService: jest.Mocked<ParentBrokerSearchService>;
  let mockPersonSearchService: jest.Mocked<PersonSearchService>;
  let mockTeamSearchService: jest.Mocked<TeamSearchService>;
  let mockTraderTeamSearchService: jest.Mocked<TraderTeamSearchService>;

  beforeEach(() => {
    mockPortfolioService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<PortfolioService> as jest.Mocked<PortfolioService>;

    mockSecurityService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<SecurityService> as jest.Mocked<SecurityService>;

    mockPersonSearchService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<PersonSearchService> as jest.Mocked<PersonSearchService>;

    mockBrokerService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<BrokersService> as jest.Mocked<BrokersService>;

    mockCodeValueService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<CodeValueService> as jest.Mocked<CodeValueService>;

    mockParentBrokerService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<ParentBrokerSearchService> as jest.Mocked<ParentBrokerSearchService>;

    mockTeamSearchService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<TeamSearchService> as jest.Mocked<TeamSearchService>;

    mockTraderTeamSearchService = {
      search: jest.fn().mockReturnValue(of([])),
      loadInitialData: jest.fn().mockReturnValue(of([])),
    } as Partial<TraderTeamSearchService> as jest.Mocked<TraderTeamSearchService>;

    TestBed.configureTestingModule({
      imports: [StoreModule.forRoot({})],
      providers: [
        { provide: PersonSearchService, useValue: mockPersonSearchService },
        { provide: TeamSearchService, useValue: mockTeamSearchService },
        {
          provide: TraderTeamSearchService,
          useValue: mockTraderTeamSearchService,
        },
        { provide: BrokersService, useValue: mockBrokerService },
        {
          provide: ParentBrokerSearchService,
          useValue: mockParentBrokerService,
        },
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: CodeValueService, useValue: mockCodeValueService },
        { provide: SecurityService, useValue: mockSecurityService },
        {
          provide: RuntimeConfigExt,
          useValue: {},
        },
        { provide: 'amesconfig', useValue: {} },
        DataAccessFacadeService,
      ],
    });
    service = TestBed.inject(DataAccessFacadeService);
  });

  it('should persist initial data if loadInitData called', () => {
    // arrange
    const searchContext: SearchContext = {
      searchType: SearchType.Broker,
    };
    const initialDataSpy = jest.spyOn(service.initialDataPersisted$, 'next');

    // act
    service.loadInitialData(searchContext).subscribe(() => {
      // expect
      expect(initialDataSpy).toHaveBeenCalledWith(true);
    });
  });
});
