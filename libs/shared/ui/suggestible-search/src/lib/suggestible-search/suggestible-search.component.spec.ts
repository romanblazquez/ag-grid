/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:51 PM
 */

import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SuggestibleSearchService } from '@fmr-pr000539/shared/data-access/suggestible-search';
import { SecuritySuggestion } from '@fmr-pr000539/shared/data';
import { SearchBarComponent } from '@fmr-pr000539/shared/ui/search-bar';
import { MockComponent } from 'ng-mocks';
import { of } from 'rxjs';
import { SearchContext } from '../domain/suggestible-search-bar.constant';
import {
  searchResultColumns,
  searchResultColumnWidths,
} from './../domain/suggestible-search-bar.constant';
import { SuggestibleSearchSuggestion } from './../domain/suggestible-search-bar.model';
import { SuggestibleSearchComponent } from './suggestible-search.component';
import { TrackingService } from '@fmr-pr000539/eqt-tracking-module';
import { UsageStatsService } from '@fmr-pr000264/ames-usagestats-service';

describe('SuggestibleSearchBarComponent', () => {
  let component: SuggestibleSearchComponent;
  let fixture: ComponentFixture<SuggestibleSearchComponent>;

  // Dependencies
  let suggestibleSearchService: SuggestibleSearchService;
  let trackingService: TrackingService;
  let usageTrackService: UsageStatsService;
  let searchBarComponent: SearchBarComponent<SuggestibleSearchSuggestion>;

  // Data
  let mockSuggestion: SuggestibleSearchSuggestion;

  beforeEach(async () => {
    mockSuggestion = {
      ticker: 'AAPL',
      tradeableEntityId: '123',
    } as SecuritySuggestion;

    suggestibleSearchService = {} as SuggestibleSearchService;
    suggestibleSearchService.getSecurity = jest.fn();

    trackingService = {} as TrackingService;
    trackingService.trackEvent = jest.fn();

    usageTrackService = {} as UsageStatsService;
    usageTrackService.logEvent = jest.fn();

    await TestBed.configureTestingModule({
      declarations: [
        SuggestibleSearchComponent,
        MockComponent(SearchBarComponent),
      ],
      providers: [
        { provide: UsageStatsService, useValue: usageTrackService },
        {
          provide: SuggestibleSearchService,
          useValue: suggestibleSearchService,
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuggestibleSearchComponent);
    component = fixture.componentInstance;

    searchBarComponent = fixture.debugElement
      .query(By.directive(SearchBarComponent))
      .injector.get(SearchBarComponent);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('@Input() set #searchContext()', () => {
    it('should update component configuration when searchContext changes', () => {
      // Act
      component.searchContext = SearchContext.Company;
      fixture.detectChanges();

      // Assert
      expect(component.searchContext).toBe(SearchContext.Company);
      expect(searchBarComponent.placeholderText).toBe('Symbol');
      expect(searchBarComponent.searchResultColumns).toBe(
        searchResultColumns[SearchContext.Company],
      );
      expect(searchBarComponent.searchResultColumnWidths).toBe(
        searchResultColumnWidths[SearchContext.Company],
      );
      if (searchBarComponent.displayFunction) {
        expect(searchBarComponent.displayFunction(mockSuggestion)).toBe('AAPL');
      }
    });

    describe('Input() #defaultSuggestions', () => {
      it('should update default suggestions', () => {
        // Act
        component.defaultSuggestions = [mockSuggestion];
        fixture.detectChanges();

        // Assert
        expect(searchBarComponent.defaultResults).toEqual([mockSuggestion]);
      });
    });

    describe('#getSuggestions()', () => {
      [
        { searchResponse: {}, result: null },
        { searchResponse: { suggestions: null }, result: null },
        {
          searchResponse: {
            suggestions: [{ ticker: 'AAPL', tradeableEntityId: '123' }],
          },
          result: [{ ticker: 'AAPL', tradeableEntityId: '123' }],
        },
      ].forEach((params) =>
        it(`should return search results as ${params.result} when API returns ${params.searchResponse}`, () => {
          // Arrange
          component.searchContext = SearchContext.Company;
          suggestibleSearchService.getSecurity = jest
            .fn()
            .mockReturnValue(
              of(JSON.parse(JSON.stringify(params.searchResponse))),
            );

          // Act
          searchBarComponent.searchEvent.emit('test search');
          fixture.detectChanges();

          // Assert
          expect(searchBarComponent.searchResults).toEqual(params.result);
        }),
      );
    });
    //   TODO: Fix this test case
    //   it(`should return error message when service call fails`, () => {
    //     // Arrange
    //     component.searchContext = SearchContext.Company;
    //     suggestibleSearchService.getSecurity = jest
    //       .fn()
    //       .mockReturnValue(throwError('Error'));
    //
    //     // Act
    //     searchBarComponent.searchEvent.emit('test search');
    //     fixture.detectChanges();
    //
    //     // Assert
    //     expect(searchBarComponent.errorMessage).toEqual(
    //       'System error occurred while searching test search. Please try again later.'
    //     );
    //   });
    // });

    describe('#selectSuggestion()', () => {
      it('should call event service when selectEvent is emitted', () => {
        // Arrange
        component.selectEvent = {} as EventEmitter<SuggestibleSearchSuggestion>;
        component.selectEvent.emit = jest.fn();

        // Act
        searchBarComponent.selectEvent.emit(mockSuggestion);
        fixture.detectChanges();

        // Asset
        expect(component.selectEvent.emit).toHaveBeenCalledWith(mockSuggestion);
      });
    });

    describe('#clearSearch()', () => {
      it('should call event service when clearEvent is emitted', () => {
        // Arrange
        component.clearEvent = {} as EventEmitter<string>;
        component.clearEvent.emit = jest.fn();

        // Act
        searchBarComponent.clearEvent.emit('ALC');
        fixture.detectChanges();

        // Asset
        expect(component.clearEvent.emit).toHaveBeenCalledWith('ALC');
      });
    });

    describe('@Input of #disabled', () => {
      it('should disable the SearchBarComponent field when disabled is set ', () => {
        // Act
        component.disabled = true;
        fixture.detectChanges();

        const inputSearchBarComponent = fixture.debugElement
          .query(By.directive(SearchBarComponent))
          .injector.get(SearchBarComponent);
        fixture.detectChanges();

        // Assert
        expect(inputSearchBarComponent.disabled).toBe(true);
      });
    });

    describe('@Input of #requiredSearch', () => {
      it('should be true when requiredSearch is set to true ', () => {
        // Act
        component.requiredSearch = true;
        fixture.detectChanges();

        const inputSearchBarComponent = fixture.debugElement
          .query(By.directive(SearchBarComponent))
          .injector.get(SearchBarComponent);
        fixture.detectChanges();

        // Assert
        expect(inputSearchBarComponent.requiredSearch).toBe(true);
      });
    });

    describe('@Input of #searchTouched', () => {
      it('should be true when searchTouched is set to true ', () => {
        // Act
        component.searchTouched = true;
        fixture.detectChanges();

        const inputSearchBarComponent = fixture.debugElement
          .query(By.directive(SearchBarComponent))
          .injector.get(SearchBarComponent);
        fixture.detectChanges();

        // Assert
        expect(inputSearchBarComponent.searchTouched).toBe(true);
      });
    });
  });
});
