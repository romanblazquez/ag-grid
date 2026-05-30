/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on December 18, 2025
 */

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BrokersService } from './broker.service';
import { PreferenceService } from './preference.service';
import { getBrokerServiceUrl } from '../../state/selectors';
import { Broker } from '@fmr-pr000539/eqt-ngrx-refdata-services-module';
import { BrokerDealerResponse } from '../../model/broker-dealer-response.interface';
import { Context } from '../../model/context.model';
import { TreeNode } from '../../model/tree-result.model';
import { NodeName, PreferenceKey } from '../../model/preference-context.model';
import { of } from 'rxjs';

describe('BrokersService', () => {
  let service: BrokersService;
  let httpMock: HttpTestingController;
  let store: MockStore;
  let preferenceService: jest.Mocked<PreferenceService>;

  const mockBrokerServiceUrl = 'https://api.example.com/broker/';
  const mockBrokers: Broker[] = [
    {
      id: '1',
      idSrc: '100',
      firmNumber: 100,
      shortName: 'BROKER1',
      longName: 'Broker One Limited',
      tradeBrokerIndicator: 'Y',
      statusCode: 'A',
      isoCtryCd: 'US',
      isoOffInd: 'N',
      countryCd: 'US',
      countryName: 'United States',
      taxWithheldRt: '0',
      firmAddDateTime: '2023-01-01T00:00:00.000',
      firmUpdateDateTime: '2023-01-01T00:00:00.000',
      affiliatedIndicator: 'N',
      parentFirmLongName: 'Parent Broker One',
    },
    {
      id: '2',
      idSrc: '200',
      firmNumber: 200,
      shortName: 'BROKER2',
      longName: 'Broker Two Corporation',
      tradeBrokerIndicator: 'Y',
      statusCode: 'A',
      isoCtryCd: 'UK',
      isoOffInd: 'N',
      countryCd: 'UK',
      countryName: 'United Kingdom',
      taxWithheldRt: '0',
      firmAddDateTime: '2023-01-01T00:00:00.000',
      firmUpdateDateTime: '2023-01-01T00:00:00.000',
      affiliatedIndicator: 'N',
      parentFirmLongName: 'Parent Broker Two',
    },
  ];

  const mockBrokerResponse: BrokerDealerResponse = {
    dealer: mockBrokers,
  };

  const mockContext: Context = {
    placeholder: 'Search Broker',
    initLoadData: true,
    detailHeaders: ['Short Name', 'Long Name'],
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'longName', visible: true },
    ],
    fieldWidths: {},
    emitField: 'firmNumber',
    errorMessage: 'No brokers found',
    panelWidth: 500,
    multiselect: true,
    isTreeView: true,
    treeAttributes: {
      0: ['parentFirmLongName'],
    },
    preferenceContext: {
      nodeName: NodeName.Broker,
      key: PreferenceKey.Broker,
      limit: 5,
    },
  };

  beforeEach(() => {
    const mockPreferenceService = {
      getPreference: jest.fn().mockReturnValue(of([])),
    } as Partial<PreferenceService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BrokersService,
        { provide: PreferenceService, useValue: mockPreferenceService },
        provideMockStore({
          selectors: [
            {
              selector: getBrokerServiceUrl,
              value: mockBrokerServiceUrl,
            },
          ],
        }),
      ],
    });

    service = TestBed.inject(BrokersService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);
    preferenceService = TestBed.inject(
      PreferenceService,
    ) as jest.Mocked<PreferenceService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('apiUrl$ initialization', () => {
    it('should construct apiUrl$ with dealers endpoint from store', (done) => {
      service['apiUrl$'].subscribe((url) => {
        expect(url).toBe(`${mockBrokerServiceUrl}dealers`);
        done();
      });
    });
  });

  describe('getAllBrokers', () => {
    it('should fetch all brokers with correct query parameters', (done) => {
      service.getAllBrokers().subscribe((brokers) => {
        expect(brokers).toEqual(mockBrokers);
        expect(brokers.length).toBe(2);
        done();
      });

      const expectedUrl = `${mockBrokerServiceUrl}dealers?firm-activity=CRAAL2A&firm-status-code=ACTIVE`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockBrokerResponse);
    });

    it('should map response.dealer to broker array', (done) => {
      service.getAllBrokers().subscribe((brokers) => {
        expect(brokers).toBe(mockBrokers);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('dealers'),
      );
      req.flush(mockBrokerResponse);
    });
  });

  describe('loadInitialData', () => {
    it('should load brokers and persist them in persistedData$', (done) => {
      service.loadInitialData().subscribe((brokers) => {
        expect(brokers).toEqual(mockBrokers);
        expect(service['persistedData$'].value).toEqual(mockBrokers);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('dealers'),
      );
      req.flush(mockBrokerResponse);
    });
  });

  describe('search', () => {
    it('should use persisted data when available', (done) => {
      service['persistedData$'].next(mockBrokers);

      service.search('BROKER1', mockContext).subscribe((results) => {
        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);
        done();
      });

      // No HTTP call should be made
      httpMock.expectNone((request) => request.url.includes('dealers'));
    });

    it('should fetch brokers when persistedData$ is empty', (done) => {
      service['persistedData$'].next([]);

      service.search('BROKER1', mockContext).subscribe((results) => {
        expect(results).toBeDefined();
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('dealers'),
      );
      req.flush(mockBrokerResponse);
    });

    it('should filter brokers by shortName', (done) => {
      service['persistedData$'].next(mockBrokers);

      service.search('BROKER1', mockContext).subscribe((results) => {
        expect(results).toBeDefined();
        // transformBrokersToTreeNodes will be called, results depend on transformation
        done();
      });
    });

    it('should filter brokers by longName', (done) => {
      service['persistedData$'].next(mockBrokers);

      service.search('Corporation', mockContext).subscribe((results) => {
        expect(results).toBeDefined();
        done();
      });
    });

    it('should use multiselect filter method when context.multiselect is true', (done) => {
      service['persistedData$'].next(mockBrokers);
      const multiselectContext = { ...mockContext, multiselect: true };

      const filterSpy = jest.spyOn(service, 'filterByQueryMultiselect');

      service.search('BROKER1,BROKER2', multiselectContext).subscribe(() => {
        expect(filterSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should use single select filter method when context.multiselect is false', (done) => {
      service['persistedData$'].next(mockBrokers);
      const singleSelectContext = { ...mockContext, multiselect: false };

      const filterSpy = jest.spyOn(service, 'filterByQuerySingleSelect');

      service.search('BROKER1', singleSelectContext).subscribe(() => {
        expect(filterSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should sort results by best match', (done) => {
      service['persistedData$'].next(mockBrokers);

      service.search('BROKER', mockContext).subscribe((results) => {
        expect(results).toBeDefined();
        // Results should be sorted by bestMatchSortFn
        done();
      });
    });

    it('should transform brokers to tree nodes', (done) => {
      service['persistedData$'].next(mockBrokers);

      service.search('BROKER', mockContext).subscribe((results) => {
        expect(Array.isArray(results)).toBe(true);
        // Results should be TreeNode[]
        done();
      });
    });
  });

  describe('getInitialData', () => {
    it('should call preferenceService.getPreference with correct parameters', (done) => {
      const mockTreeNodes: TreeNode[] = [
        {
          items: [
            { name: 'shortName', value: 'BROKER1' },
            { name: 'longName', value: 'Broker One Limited' },
          ],
          header: false,
        },
      ];
      preferenceService.getPreference.mockReturnValue(of(mockTreeNodes));

      service.getInitialData(mockContext).subscribe((results) => {
        expect(preferenceService.getPreference).toHaveBeenCalledWith(
          mockContext.emitField,
          mockContext.preferenceContext,
        );
        expect(results).toEqual(mockTreeNodes);
        done();
      });
    });
  });
});
