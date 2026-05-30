/*
eslint-disable max-lines
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { SearchContext } from '../model/search-context.model';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  first,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { Context } from '../model/context.model';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { moduleName } from '../model/external-services.constant';
import { AbstractData } from '../model/solr-response.model';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { filter } from 'rxjs/operators';
import { DataAccessFacadeService } from '../data-access/data-access-facade.service';
import { CommonSearchSelection } from '../model/common-search-selection.interface';
import { AutoToggle } from '../model/auto-toggle.interface';
import { SelectionChipsComponent } from '@trade-platform/shared/ui/selection-chips';
import { MultiselectData } from '../ui/grid-view-result/grid-view-result.component';
import { TreeFlatNode } from '../model/tree-result.model';
import { CommonSearchStore } from '../data-access/store/common-search.store';
import { CommonSearchInteractionType } from '../model/common-search-interaction-type.enum';

@Component({
  selector: 'fmr-pr000539-common-search',
  templateUrl: './common-search.component.html',
  styleUrls: ['./common-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CommonSearchStore],
  standalone: false,
})
export class CommonSearchComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('auto') public autocomplete!: MatAutocomplete;
  public serviceContext!: Context;
  public searchString = '';
  public clear: object | undefined;
  public myControl = new FormControl();
  public displayText = '';
  public placeholder = '';
  public currSelected: Array<any> | undefined;
  public currSelected$: BehaviorSubject<Array<any>> = new BehaviorSubject<
    Array<any>
  >([]);
  public autoToggle!: AutoToggle;
  @ViewChild('commonSearch', { read: ElementRef }) public input!: ElementRef;
  public inputValue: BehaviorSubject<string> = new BehaviorSubject('');
  public searchResults: Array<any> | undefined = [];
  public selectionComponent: SelectionChipsComponent | undefined;
  public subscriptions: Subscription[] = [];
  public showAllByDefault = false;
  @Input()
  public validators: ValidatorFn[] | undefined;
  @Input()
  public focusOnLoad = false;
  @Input()
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  public minLengthForInputValue = 3;
  @Output()
  public resultsChange = new EventEmitter<Array<any>>();
  @Input()
  public maxSelection = Infinity;
  @Output() public emitSelection = new EventEmitter<AbstractData>();
  @Output() public clearEvent = new EventEmitter<any>();
  @Input() public formGroup: FormGroup | undefined;
  public interactionType!: CommonSearchInteractionType;
  private readonly $destroy = new Subject();
  private errorMessage!: string;
  private isFocusedOut!: boolean;
  private _disabled = false;

  public constructor(
    private readonly dataFacadeService: DataAccessFacadeService,
    private readonly cd: ChangeDetectorRef,
    private readonly commonSearchStore: CommonSearchStore,
  ) {}

  private _searchContext!: SearchContext;

  @Input()
  public set searchContext(searchContext: SearchContext | null) {
    this._searchContext = searchContext as SearchContext;

    const baseContext = this.dataFacadeService.getServiceContext(
      this._searchContext.searchType,
    );
    this.serviceContext = baseContext;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this._searchContext.overrideContext) {
      this.serviceContext = {
        ...baseContext,
        ...this._searchContext.overrideContext,
      };
    }

    if (searchContext?.disableRules) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      if (searchContext.disableRules.grid)
        this.gridRule = searchContext.disableRules.grid;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      if (searchContext.disableRules.tree)
        this.treeRule = searchContext.disableRules.tree;
    }

    this.placeholder = this.serviceContext.placeholder;
  }

  @Input()
  public set triggerSelect(item: string) {
    if (item && !this.disabled) {
      this.commonSearchStore.resetState();
      this.myControl.setValue(item);
      this.filterChanged();
      this.onFocusOut();
    }
  }

  @Input()
  public set chipsComponent(component: SelectionChipsComponent | undefined) {
    if (component) {
      this.subscriptions.push(
        component.removeItem.subscribe((item) => {
          if (item.context === this.serviceContext.chipContext?.name) {
            this.commonSearchStore.updateAutoSelect('');
            this.autoToggle = { deselect: item.value as string };
            this.cd.detectChanges();
          }
        }),
      );

      this.subscriptions.push(
        component.removeContext.subscribe((item) => {
          if (item === this.serviceContext.chipContext?.name) {
            this.clear = {};
            this.resetSearch();
            this.cd.detectChanges();
          }
        }),
      );
      this.selectionComponent = component;
    }
  }

  @Input()
  public set clearSelection(clear: any) {
    if (clear) {
      this.clear = {};
      this.resetSearch();
    }
  }

  @Input()
  public set clearItem(item: string) {
    if (item) {
      this.autoToggle = { deselect: item };
    }
  }

  @Input()
  public set disabled(value: boolean) {
    this._disabled = value;
    if (value) {
      this.myControl.disable();
    } else {
      this.myControl.enable();
    }
  }

  public get disabled(): boolean {
    return this._disabled;
  }

  public gridRule: (node: MultiselectData) => boolean = (node) => false;

  public treeRule: (node: TreeFlatNode) => boolean = (node) => false;

  public ngOnInit(): void {
    const allValidators = [
      ...(this.validators ?? []),
      this.validSelectionValidator(),
    ];
    this.myControl.addValidators(allValidators);
    if (this.formGroup)
      this.formGroup.addControl(this._searchContext.searchType, this.myControl);

    this.subscribeToInteractionType();

    this.showAllByDefault =
      this.serviceContext.initLoadData &&
      (this.serviceContext.showAll ? this.serviceContext.showAll : false);
    this.inputValue
      .pipe(
        takeUntil(this.$destroy),
        filter((value) => value.length >= this.minLengthForInputValue),
        debounceTime(300),
        switchMap((query) => {
          if (this.serviceContext.initLoadData) {
            return this.isInitDataReady().pipe(
              switchMap((ready) =>
                this.dataFacadeService.getSuggestedData(
                  this.serviceContext,
                  this._searchContext.searchType,
                  query,
                ),
              ),
            );
          } else {
            return this.dataFacadeService.getSuggestedData(
              this.serviceContext,
              this._searchContext.searchType,
              query,
            );
          }
        }),
        catchError((error) => {
          this.errorMessage = `System error occurred while searching. Please try again later.`;
          return of([]);
        }),
      )
      .subscribe((results) => {
        this.handleResults(results as any[]);
        this.commonSearchStore.updateResultsLoadedState(true);
      });

    if (this.serviceContext.initLoadData) {
      this.dataFacadeService
        .loadInitialData(this._searchContext)
        .pipe(take(1))
        .subscribe();
    }
    this.dataFacadeService.loadPreferences(this._searchContext);
    this.currSelected$.subscribe((selected) => {
      this.currSelected = selected;
    });
  }

  public ngAfterViewInit(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    if (this.focusOnLoad) this.input.nativeElement.focus();

    this.subscriptions.push(
      this.commonSearchStore
        .select((s) => s.isFocusedOut)
        .subscribe((val) => (this.isFocusedOut = val)),
    );
  }

  public validSelectionValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const hasRequiredValidator = this.validators?.some(
        (validator) => validator === Validators.required,
      );

      if (!control.value && hasRequiredValidator) {
        return { required: true };
      }

      if (
        control.value &&
        this.isFocusedOut &&
        (!this.currSelected || this.currSelected.length === 0)
      ) {
        return { errors: this.serviceContext.errorMessage };
      }

      return null;
    };
  }

  public handleResults(results: any[]): void {
    this.searchResults = results;
    this.autocomplete.showPanel = results.length > 0;
    if (this.searchResults.length === 0) {
      this.handleEmptyResults();
    }
    this.cd.detectChanges();
  }

  public handleEmptyResults(): void {
    this.myControl.setErrors({
      errors: this.serviceContext.errorMessage,
    });
    this.cd.markForCheck();
  }

  public filterChanged(): void {
    if (this.disabled) {
      return;
    }
    this.searchString = this.myControl.value as string;
    this.inputValue.next(this.searchString);
    if (this.searchString === '') {
      this.clearSearch();
    }
  }

  public onFocusOut(): void {
    if (this.disabled) {
      return;
    }
    this.commonSearchStore.updateAutoSelect(this.searchString);
    this.commonSearchStore.updateFocusOutState(true);
    setTimeout(() => {
      if (!this.currSelected || this.currSelected.length === 0) {
        this.searchResults = undefined;
      } else {
        this.searchResults = this.currSelected;
      }
    }, 1000);
  }

  public onFocusIn(): void {
    if (this.disabled) {
      return;
    }
    this.commonSearchStore.resetState();
    if (this.inputValue.value == '') {
      this.dataFacadeService
        .getInitialData(this.serviceContext, this._searchContext.searchType)
        .pipe(
          filter((initialData) => initialData.length > 0),
          take(1),
        )
        .subscribe((initialData) => {
          this.handleResults(initialData);
        });
    } else if (this.currSelected) {
      this.autocomplete.showPanel = this.currSelected.length > 0;
    }
  }

  public clearVisible(): boolean {
    return (
      !this.disabled && !!(this.searchString && this.searchString.length > 0)
    );
  }

  public emitSelectedGridView(selected: CommonSearchSelection): void {
    this.emitSelected(selected);
    if (!this.serviceContext.multiselect) this.autocomplete.showPanel = false;
  }

  public emitSelected(selected: CommonSearchSelection): void {
    const oldSelection: string[] = this.myControl.value
      ? (this.myControl.value as string).split(',')
      : [];
    this.trackFilterModified(oldSelection, selected.displayText);
    this.currSelected$.next(selected.data as Array<any>);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.emitSelection.emit(selected.values);
    this.resultsChange.emit(selected.data);
    this.updateSelection(selected.displayText);
    this.setDisplayText(selected.displayText);
    this.dataFacadeService.setPreference(
      this._searchContext,
      this.getPreferenceData(selected),
      this.serviceContext.isTreeView,
    );
    if (selected.values.length > this.maxSelection) {
      this.myControl.setErrors({
        errors: `Max ${this.maxSelection}`,
      });
      this.cd.detectChanges();
    }
  }

  public updateSelection(selected: Array<string>): void {
    const chipContext = this.serviceContext.chipContext;
    if (this.selectionComponent && chipContext) {
      chipContext.items = selected;
      const findContext = this.selectionComponent.chips.find(
        (context) => context.name === this.serviceContext.chipContext?.name,
      );
      if (findContext) {
        const chips = this.selectionComponent.chips;
        const index = chips.indexOf(findContext);
        chips[index] = chipContext;
        this.selectionComponent.chipContexts = [...chips];
      } else {
        this.selectionComponent.chipContexts = [
          ...this.selectionComponent.chips,
          chipContext,
        ];
      }
    }
    this.cd.detectChanges();
  }

  public setDisplayText(selected: Array<any>): void {
    this.displayText =
      selected.length > 0
        ? selected.toString()
        : this.serviceContext.placeholder;

    if (selected.length > 0) {
      this.searchString = this.displayText;
      this.myControl.setValue(this.displayText);
    } else {
      this.searchString = '';
      this.myControl.setValue('');
      this.inputValue.next('');
    }
    this.cd.detectChanges();
  }

  public clearSearch(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.clear = {};
    this.resetSearch();
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.$destroy.next(true);
    this.$destroy.complete();
  }

  protected subscribeToInteractionType(): void {
    this.commonSearchStore.insertMethod
      .pipe(takeUntil(this.$destroy))
      .subscribe((method) => {
        this.interactionType =
          method ?? CommonSearchInteractionType.FromSelection;
      });
  }

  /**
   * Determines what data format to save in preferences based on context.
   * - For non-TreeView with initLoadData: saves values (IDs)
   * - Otherwise: saves full data objects/structures
   */
  private getPreferenceData(selected: CommonSearchSelection): any[] {
    if (this.serviceContext.initLoadData && !this.serviceContext.isTreeView) {
      return selected.values;
    } else {
      return selected.data;
    }
  }

  private isInitDataReady(): Observable<boolean> {
    if (this.serviceContext.initLoadData) {
      return this.dataFacadeService.initialDataPersisted$.pipe(
        filter((val) => val),
        first(),
      );
    } else {
      return of(true);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private trackFilterModified(
    _previusSelection: Array<any> | undefined,
    _newSelection: Array<any> | undefined,
  ): void {
    // Tracking removed: proprietary @fmr-pr000539/eqt-tracking-module not available
  }

  private resetSearch(): void {
    this.myControl.setValue('');
    this.inputValue.next('');
    this.clearEvent.emit(this.searchString);
    this.searchResults = undefined;
    this.searchString = '';
    this.autocomplete.showPanel = false;
    this.commonSearchStore.resetState();
  }
}
