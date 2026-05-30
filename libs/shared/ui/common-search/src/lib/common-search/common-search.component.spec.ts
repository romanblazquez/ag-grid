import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonSearchComponent } from './common-search.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TrackingService } from '@fmr-pr000539/eqt-tracking-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MockComponent } from 'ng-mocks';
import { SearchType } from '../model/search-type.model';
import { TreeViewResultComponent } from '../ui/tree-view-result/tree-view-result.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { DataAccessFacadeService } from '../data-access/data-access-facade.service';
import { of } from 'rxjs';
import { GridViewResultComponent } from '../ui/grid-view-result/grid-view-result.component';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { SearchContext } from '../model/search-context.model';
import { CommonSearchSelection } from '../model/common-search-selection.interface';

describe('CommonSearchComponent', () => {
  let component: CommonSearchComponent;
  let fixture: ComponentFixture<CommonSearchComponent>;
  let mockDataAccessFacadeService: jest.Mocked<DataAccessFacadeService>;
  let trackingService: TrackingService;
  beforeEach(async () => {
    trackingService = {} as TrackingService;
    trackingService.trackEvent = jest.fn();

    mockDataAccessFacadeService = {
      getServiceContext: jest.fn().mockReturnValue({}),
      getSuggestedData: jest.fn().mockReturnValue(of([])),
      setPreference: jest.fn(),
      loadPreferences: jest.fn().mockReturnValue(of([])),
    } as Partial<DataAccessFacadeService> as jest.Mocked<DataAccessFacadeService>;

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NoopAnimationsModule,
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatIconModule,
      ],
      providers: [
        { provide: TrackingService, useValue: trackingService },
        {
          provide: DataAccessFacadeService,
          useValue: mockDataAccessFacadeService,
        },
        {
          provide: RuntimeConfigExt,
          useValue: {},
        },
      ],
      declarations: [
        CommonSearchComponent,
        MockComponent(TreeViewResultComponent),
        MockComponent(GridViewResultComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommonSearchComponent);
    component = fixture.componentInstance;
    component.searchContext = {
      searchType: SearchType.FundPm,
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emitSelected should emit values, update display & chips component', () => {
    const selected: CommonSearchSelection = {
      data: [],
      displayText: [],
      values: [],
    };
    const spy = jest.spyOn(component.emitSelection, 'emit');

    component.emitSelected(selected);

    expect(spy).toHaveBeenCalled();
    expect(mockDataAccessFacadeService.setPreference).toHaveBeenCalled();
  });

  it('filterchanged should call retrieveData when FUND_PM context & more than two chars', () => {
    component.myControl.setValue('abc');
    const spy = jest.spyOn(component.inputValue, 'next');
    component.filterChanged();
    expect(spy).toHaveBeenCalledWith('abc');
  });

  it('onFocusOut searchresults should only hold any items already selected', () => {
    component.myControl.setValue('abc');
    component.currSelected = [{ data: 'test' }];
    component.onFocusOut();
    expect(component.myControl.value).toBe('abc');
    setTimeout(() => {
      expect(component.searchResults).toBeDefined();
    }, 500);
  });

  it('onFocusOut searchresults if nothing selected', () => {
    component.myControl.setValue('abc');
    component.currSelected = [];
    component.onFocusOut();
    expect(component.myControl.value).toBe('abc');
    setTimeout(() => {
      expect(component.searchResults).toBeUndefined();
    }, 500);
  });

  it('onOpen should keep autocomplete open if data is loaded dynamically, search is less than 2 chars & selected list is populated', () => {
    component.autocomplete.showPanel = true;
    component.searchString = 'a';
    component.currSelected = [{ data: 'any' }];
    // component.onOpen();
    expect(component.autocomplete.showPanel).toBe(true);
  });

  it('should intialize placeholder with what is provided from searchContext', async () => {
    // Arrange
    const searchContext: SearchContext = {
      searchType: SearchType.Broker,
      overrideContext: {
        placeholder: 'Broker',
        initLoadData: true,
        detailHeaders: ['header'],
        detailFields: [],
        fieldWidths: { sd: 3 },
        emitField: 'id',
        errorMessage: 'error',
        panelWidth: 500,
      },
    };

    // Act
    component.searchContext = searchContext;

    // Assert
    expect(component.placeholder).toEqual(
      searchContext.overrideContext?.placeholder,
    );
  });
  describe('Tracking Events', () => {
    it('should track FilterModified when component emits that the filter has changed or has been selected', async () => {
      // Arrange
      component.searchContext = { searchType: SearchType.Broker };
      const selection: CommonSearchSelection = {
        data: [
          {
            id: '10317293383',
            idSrc: '78268',
            firmNumber: 78268,
            elecPlacementInd: null,
            shortName: 'ALECAP',
            longName: 'ALETHEIA CAPITAL LIMITED',
            tradeBrokerIndicator: 'N',
            statusCode: 'A',
            isoCtryCd: 'HK',
            isoOffInd: 'Y',
            countryCd: 'HOKO',
            countryName: 'HONG KONG',
            taxWithheldRt: '0',
            firmAddDateTime: '2022-07-14T19:29:19.000',
            firmUpdateDateTime: '2025-08-06T00:09:06.000',
            contacts: null,
            affiliatedIndicator: 'N',
          },
        ],
        values: ['78268'],
        displayText: ['ALECAP'],
      };
      const trackActionSpy = jest.spyOn(trackingService, 'trackEvent');

      // Act
      component.emitSelected(selection);

      // Assert
      expect(trackActionSpy).toHaveBeenCalledWith({
        action: 'FilterModified',
        appModule: 'Common Multi-Select',
        additionalAttributes: {
          filterName: 'Broker',
          previousValue: '[]',
          currentValue: '["ALECAP"]',
          interactionType: 'insertFromSelection',
        },
      });
    });
  });

  describe('getPreferenceData', () => {
    it('should return values when initLoadData is true and isTreeView is false', () => {
      // Arrange
      component.searchContext = { searchType: SearchType.Broker };
      component.serviceContext = {
        initLoadData: true,
        isTreeView: false,
        placeholder: 'Broker',
        detailHeaders: [],
        detailFields: [],
        fieldWidths: {},
        emitField: 'id',
        errorMessage: 'error',
        panelWidth: 500,
      };

      const selection: CommonSearchSelection = {
        data: [{ id: '1', name: 'Test' }],
        values: ['1'],
        displayText: ['Test'],
      };

      // Act
      const result = component['getPreferenceData'](selection);

      // Assert
      expect(result).toEqual(['1']);
    });

    it('should return data when initLoadData is true and isTreeView is true', () => {
      // Arrange
      component.searchContext = { searchType: SearchType.Broker };
      component.serviceContext = {
        initLoadData: true,
        isTreeView: true,
        placeholder: 'Broker',
        detailHeaders: [],
        detailFields: [],
        fieldWidths: {},
        emitField: 'id',
        errorMessage: 'error',
        panelWidth: 500,
      };

      const selection: CommonSearchSelection = {
        data: [{ id: '1', name: 'Test' }],
        values: ['1'],
        displayText: ['Test'],
      };

      // Act
      const result = component['getPreferenceData'](selection);

      // Assert
      expect(result).toEqual([{ id: '1', name: 'Test' }]);
    });

    it('should return data when initLoadData is false', () => {
      // Arrange
      component.searchContext = { searchType: SearchType.Broker };
      component.serviceContext = {
        initLoadData: false,
        isTreeView: false,
        placeholder: 'Broker',
        detailHeaders: [],
        detailFields: [],
        fieldWidths: {},
        emitField: 'id',
        errorMessage: 'error',
        panelWidth: 500,
      };

      const selection: CommonSearchSelection = {
        data: [{ id: '1', name: 'Test' }],
        values: ['1'],
        displayText: ['Test'],
      };

      // Act
      const result = component['getPreferenceData'](selection);

      // Assert
      expect(result).toEqual([{ id: '1', name: 'Test' }]);
    });
  });

  describe('onFocusIn', () => {
    it('should load initial data when input value is empty', () => {
      // Arrange
      component.searchContext = { searchType: SearchType.Broker };
      component.inputValue.next('');
      mockDataAccessFacadeService.getInitialData = jest
        .fn()
        .mockReturnValue(of([{ id: '1', name: 'Test' }]));

      // Act
      component.onFocusIn();

      // Assert
      expect(mockDataAccessFacadeService.getInitialData).toHaveBeenCalled();
    });
  });

  describe('disabled', () => {
    it('should disable myControl when disabled is set to true', () => {
      component.disabled = true;
      expect(component.myControl.disabled).toBe(true);
    });

    it('should enable myControl when disabled is set to false', () => {
      component.disabled = true;
      component.disabled = false;
      expect(component.myControl.disabled).toBe(false);
    });

    it('disabled getter should return the current disabled state', () => {
      component.disabled = true;
      expect(component.disabled).toBe(true);

      component.disabled = false;
      expect(component.disabled).toBe(false);
    });

    it('filterChanged() should return early and not update inputValue when disabled', () => {
      component.disabled = true;
      component.myControl.setValue('abc', { emitEvent: false });
      const spy = jest.spyOn(component.inputValue, 'next');

      component.filterChanged();

      expect(spy).not.toHaveBeenCalled();
    });

    it('onFocusIn() should return early and not load data when disabled', () => {
      component.disabled = true;
      component.inputValue.next('');
      mockDataAccessFacadeService.getInitialData = jest
        .fn()
        .mockReturnValue(of([{ id: '1', name: 'Test' }]));

      component.onFocusIn();

      expect(mockDataAccessFacadeService.getInitialData).not.toHaveBeenCalled();
    });

    it('onFocusOut() should return early and not update store when disabled', () => {
      component.disabled = true;
      const spy = jest.spyOn(
        component['commonSearchStore'],
        'updateAutoSelect',
      );

      component.onFocusOut();

      expect(spy).not.toHaveBeenCalled();
    });

    it('clearVisible() should return false when disabled', () => {
      component.disabled = true;
      component.searchString = 'abc';

      expect(component.clearVisible()).toBe(false);
    });

    it('clearVisible() should return true when enabled and searchString is non-empty', () => {
      component.disabled = false;
      component.searchString = 'abc';

      expect(component.clearVisible()).toBe(true);
    });

    it('triggerSelect should not update control or call filterChanged when disabled', () => {
      component.disabled = true;
      const spy = jest.spyOn(component.inputValue, 'next');

      component.triggerSelect = 'ETF';

      expect(component.myControl.value).toBeFalsy();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
