import { DebugElement } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Validators } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SearchBarComponent } from './search-bar.component';

interface TestSearch {
  id: number;
  name: string;
}

describe('SearchBarComponent', () => {
  let component: SearchBarComponent<unknown>;
  let fixture: ComponentFixture<SearchBarComponent<unknown>>;

  let mockResults: Array<TestSearch>;

  let searchInputElement: HTMLInputElement;
  let dropDownElement: DebugElement;
  let clearButtonElement: DebugElement;

  beforeEach(async () => {
    const result1 = { id: 1, name: 'One' } as TestSearch;
    const result2 = { id: 2, name: 'Two' } as TestSearch;
    mockResults = [result1, result2];

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SearchBarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;

    component.searchResultColumns = ['id', 'name'];
    component.searchResultColumnWidths = [50, 50];
    component.displayFunction = (testSearch) => JSON.stringify(testSearch);

    fixture.detectChanges();

    searchInputElement = fixture.debugElement.query(
      By.css('input'),
    ).nativeElement;
    dropDownElement = fixture.debugElement.query(By.css('default-results'));
    clearButtonElement = fixture.debugElement.query(By.css('clear-button'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Element #input', () => {
    it('should emit value when search changes', fakeAsync(() => {
      component.searchEvent.subscribe((searchQuery) => {
        expect(searchQuery).toEqual('IBM');
        expect(component.searchResults).toEqual([]);
        expect(clearButtonElement).toBeDefined();
      });
      component.searchFormControl.setValue('IBM');
      tick(500);
    }));

    it('should not emit value is null', fakeAsync(() => {
      component.searchEvent.subscribe((searchQuery) => {
        expect(searchQuery).toBeNull();
        expect(component.searchResults).toEqual([]);
        expect(clearButtonElement).toBeDefined();
      });
      component.searchFormControl.setValue(null);
      tick(500);
    }));
  });

  describe('Element #clearButton', () => {
    it('should not show clear button when disabled', () => {
      component.enableClearButton = false;
      fixture.detectChanges();
      expect(clearButtonElement).toBeFalsy();
    });

    it('should not show clear button when enabled and input is not on focus', () => {
      component.enableClearButton = true;
      component.searchFormControl.setValue('AAPL');
      searchInputElement.dispatchEvent(
        new FocusEvent('blur', { bubbles: true }),
      );
      fixture.detectChanges();
      expect(clearButtonElement).toBeFalsy();
    });

    it('should show clear button when enabled and input is on focus', () => {
      component.enableClearButton = true;
      component.searchFormControl.setValue('AAPL');
      searchInputElement.dispatchEvent(
        new FocusEvent('focus', { bubbles: true }),
      );
      fixture.detectChanges();
      expect(clearButtonElement).toBeDefined();
    });
  });

  describe('@Input() set #defaultResults', () => {
    it('should not show dropdown when default results are not available', () => {
      component.defaultResults = undefined;
      fixture.detectChanges();

      expect(dropDownElement).toBeNull();
      expect(component.searchFormControl.value).toBeNull();
    });

    it('should show dropdown when default results are available and input is not on focus', () => {
      component.defaultResults = mockResults;
      searchInputElement.dispatchEvent(
        new FocusEvent('blur', { bubbles: true }),
      );
      fixture.detectChanges();

      expect(dropDownElement).toBeDefined();
      expect(component.searchFormControl.value).toBe(mockResults[0]);
    });

    it('should not show dropdown when default results are available and input is on focus', () => {
      component.defaultResults = mockResults;
      searchInputElement.dispatchEvent(
        new FocusEvent('focus', { bubbles: true }),
      );
      fixture.detectChanges();

      expect(dropDownElement).toBeNull();
      expect(component.searchFormControl.value).toBe(mockResults[0]);
    });

    it('should select first result when autoSelectFirstOptionOnUpdate is true and form has a value', () => {
      component.autoSelectFirstOptionOnUpdate = true;
      const selectFirstResultSpy = jest.spyOn(component, 'selectFirstResult');
      component.searchFormControl.setValue('testValue');

      component.defaultResults = ['testValue'];
      fixture.detectChanges();

      expect(selectFirstResultSpy).toHaveBeenCalledWith(
        component.defaultResults,
      );
    });

    it('should select first result when autoSelectFirstOptionOnUpdate is true and form has no value', () => {
      component.autoSelectFirstOptionOnUpdate = true;
      const selectFirstResultSpy = jest.spyOn(component, 'selectFirstResult');

      component.defaultResults = ['testValue'];
      fixture.detectChanges();

      expect(selectFirstResultSpy).toHaveBeenCalledWith(
        component.defaultResults,
        true,
      );
    });
  });

  describe('Input #clearSymbol', () => {
    it('should clear symbol box and reset search results', () => {
      component.searchFormControl.setValue('AAPL');
      component.searchResults = [mockResults];

      component.clearSymbol = {};

      expect(component.searchFormControl.value).toEqual('');
      expect(component.searchResults).toEqual([]);
    });
  });

  describe('Output #selectEvent', () => {
    it('should', (done) => {
      const event = {
        option: { value: mockResults[0] },
      } as MatAutocompleteSelectedEvent;

      component.selectEvent.subscribe((selectedOption) => {
        expect(selectedOption).toEqual(mockResults[0]);
        done();
      });
      component.selectResult(event);
    });
  });

  describe('Element #errorMessage', () => {
    it('should display error message when set  via input', fakeAsync(() => {
      component.errorMessage = 'Mock error';
      fixture.detectChanges();
      tick(500);

      const errorElement: HTMLSpanElement = fixture.debugElement.query(
        By.css('span.error-message'),
      ).nativeElement;
      expect(errorElement.textContent?.trim()).toBe(`Mock error`);
    }));

    it('should clear an existing error message on selecting a search result', fakeAsync(() => {
      const mockOption = {
        option: { value: mockResults[0] },
      } as MatAutocompleteSelectedEvent;
      component.errorMessage = 'Mock error';
      fixture.detectChanges();
      tick(500);

      const matAutoCompleteElement = fixture.debugElement
        .query(By.directive(MatAutocomplete))
        .injector.get(MatAutocomplete);

      matAutoCompleteElement.optionSelected.emit(mockOption);
      fixture.detectChanges();
      tick(500);

      expect(
        fixture.debugElement.query(By.css('span.error-message')),
      ).toBeNull();
    }));

    it('should not should error message when search query works', fakeAsync(() => {
      fixture.detectChanges();
      component.enableClearButton = true;
      component.searchFormControl.setValue('AAPL11');
      tick(500);

      expect(component.errorMessage).toBeUndefined();
    }));
  });

  describe('#Input of disabled', () => {
    it('should disable the input field when disabled is set ', fakeAsync(() => {
      component.disabled = true;
      fixture.detectChanges();
      tick(500);

      const inputComponent = fixture.debugElement
        .query(By.directive(MatInput))
        .injector.get(MatInput);
      fixture.detectChanges();
      tick(500);

      expect(inputComponent.readonly).toBe(true);
    }));
  });

  describe('@Input() set #requiredSearch', () => {
    it('should set validators when true', () => {
      component.requiredSearch = true;
      fixture.detectChanges();
      expect(component.searchFormControl.hasValidator(Validators.required));
    });
  });

  describe('@Input() set #searchTouched', () => {
    it('should markAsTouched when true', () => {
      component.searchTouched = true;
      fixture.detectChanges();
      expect(component.searchFormControl.touched).toBeTruthy();
    });

    it('should markAsTouched when false', () => {
      component.searchTouched = false;
      fixture.detectChanges();
      expect(component.searchFormControl.touched).toBeFalsy();
    });
  });

  describe('Output #clearEvent', () => {
    it('should emit search text value', (done) => {
      component.searchFormControl.setValue('ALC');

      component.clearEvent.subscribe((fund) => {
        expect(fund).toEqual('ALC');
        done();
      });

      component.clearSearch(new Event(''));

      expect(component.searchFormControl.value).toEqual('');
    });
  });

  describe('selectFirstResult', () => {
    it('should select first result with default parameters (results = this.searchResults)', () => {
      component.searchResults = mockResults;
      component.selectFirstResult();

      expect(component.searchFormControl.value).toBe(mockResults[0]);
    });

    it('should emit selectEvent when isAutoSelectUpdate is false', (done) => {
      component.searchResults = mockResults;

      component.selectEvent.subscribe((selectedOption) => {
        expect(selectedOption).toEqual(mockResults[0]);
        done();
      });

      component.selectFirstResult();
    });
  });

  describe('showDefaultResults', () => {
    it('should set searchResults to defaultResults and open panel', () => {
      const mockEvent = new Event('click');
      const stopPropagationSpy = jest.spyOn(mockEvent, 'stopPropagation');

      component.defaultResults = mockResults;
      component.matAutocompleteTrigger = {
        openPanel: jest.fn(),
      } as any;

      component.showDefaultResults(mockEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(component.searchResults).toBe(mockResults);
      expect(component.matAutocompleteTrigger?.openPanel).toHaveBeenCalled();
    });
  });

  describe('canShowResults', () => {
    it('should return true when searchResults, searchResultColumns and searchResultColumnWidths are all defined', () => {
      component.searchResults = mockResults;
      component.searchResultColumns = ['id', 'name'];
      component.searchResultColumnWidths = [50, 50];

      expect(component.canShowResults).toBe(true);
    });

    it('should return false when searchResults is null', () => {
      component.searchResults = null;
      component.searchResultColumns = ['id', 'name'];
      component.searchResultColumnWidths = [50, 50];

      expect(component.canShowResults).toBe(false);
    });

    it('should return false when searchResults is undefined', () => {
      component.searchResults = undefined;
      component.searchResultColumns = ['id', 'name'];
      component.searchResultColumnWidths = [50, 50];

      expect(component.canShowResults).toBe(false);
    });
  });

  describe('getSearchResultByColumn', () => {
    it('should return the value of the specified column from search result', () => {
      const result = mockResults[0];
      const value = component.getSearchResultByColumn(result, 'name');

      expect(value).toBe('One');
    });

    it('should return the id value from search result', () => {
      const result = mockResults[1];
      const value = component.getSearchResultByColumn(result, 'id');

      expect(value).toBe(2);
    });
  });

  describe('onTooltipOpen', () => {
    it('should emit tooltipOpen event with column tooltip', (done) => {
      const mockTooltip = 'Test tooltip';

      component.tooltipOpen.subscribe((tooltip) => {
        expect(tooltip).toBe(mockTooltip);
        done();
      });

      component['onTooltipOpen'](mockTooltip);
    });
  });

  describe('onInputChange', () => {
    it('should call clearSearch when input value is empty', () => {
      const mockEvent = {
        target: { value: '' } as HTMLInputElement,
        stopPropagation: jest.fn(),
      } as unknown as Event;
      const clearSearchSpy = jest.spyOn(component, 'clearSearch');

      component['onInputChange'](mockEvent);

      expect(clearSearchSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should not call clearSearch when input value is not empty', () => {
      const mockEvent = {
        target: { value: 'test' } as HTMLInputElement,
      } as unknown as Event;
      const clearSearchSpy = jest.spyOn(component, 'clearSearch');

      component['onInputChange'](mockEvent);

      expect(clearSearchSpy).not.toHaveBeenCalled();
    });
  });
});
