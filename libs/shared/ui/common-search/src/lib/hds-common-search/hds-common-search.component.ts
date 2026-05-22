import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  take,
} from 'rxjs';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
} from 'primeng/autocomplete';
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { NgClass } from '@angular/common';
import {
  AbstractData,
  CommonSearchSelection,
  CommonSearchValue,
} from '../model/search-result.model';
import { Context, SearchContext } from '../model/search-context.model';
import { AutoToggle } from '../model/auto-toggle.interface';
import { CommonSearchInteractionType } from '../model/common-search-interaction-type.enum';
import { moduleName } from '../model/constants';
import { DataAccessFacadeService } from '../data-access/data-access-facade.service';
import {
  TrackingEvent,
  TrackingEventName,
  TrackingService,
} from '../data-access/tracking.service';
import {
  HdsGridViewResultComponent,
  MultiselectRow,
} from '../ui/hds-grid-view-result/hds-grid-view-result.component';
import { HdsTreeViewResultComponent } from '../ui/hds-tree-view-result/hds-tree-view-result.component';
import { TreeNode } from '../model/tree-node.model';

@Component({
  selector: 'lib-hds-common-search',
  templateUrl: './hds-common-search.component.html',
  styleUrl: './hds-common-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AutoCompleteModule,
    ReactiveFormsModule,
    MessageModule,
    FloatLabelModule,
    ButtonModule,
    TooltipModule,
    NgClass,
    HdsGridViewResultComponent,
    HdsTreeViewResultComponent,
  ],
})
export class HdsCommonSearchComponent {
  private static nextInputId = 0;

  readonly searchContext = input.required<SearchContext>();
  readonly inputId = input<string>(
    `hds-common-search-input-${++HdsCommonSearchComponent.nextInputId}`,
  );
  readonly validators = input<ValidatorFn[]>([]);
  readonly focusOnLoad = input<boolean>(false);
  readonly minLengthForInputValue = input<number>(3);
  readonly maxSelection = input<number>(Infinity);
  readonly formGroup = input<FormGroup | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly clearSelection = input<unknown>(undefined);
  readonly clearItem = input<string>('');
  readonly triggerSelect = input<string>('');
  readonly label = input<string>('');
  readonly dropdown = input<boolean>(false);
  readonly showClear = input<boolean>(true);
  readonly size = input<'small' | 'large' | undefined>('small');
  readonly maxVisibleChips = input<number>(Infinity);
  readonly separator = input<string>(',');
  readonly disableSelected = input<boolean>(true);
  readonly panelMaxHeight = input<string>('20rem');
  readonly maxSelectedRows = input<number>(0);
  readonly minWidth = input<string | undefined>(undefined);
  readonly maxWidth = input<string | undefined>(undefined);
  readonly containerClass = input<string>('');
  readonly panelClass = input<string>('');
  readonly panelMinWidth = input<string | undefined>(undefined);
  readonly panelMaxWidth = input<string | undefined>(undefined);

  readonly emitSelection = output<CommonSearchValue[]>();
  readonly clearEvent = output<CommonSearchValue[]>();
  readonly resultsChange = output<unknown[]>();

  readonly serviceContext = signal<Context | undefined>(undefined);
  readonly searchResults = signal<AbstractData[]>([]);
  readonly autoToggle = signal<AutoToggle | undefined>(undefined);
  readonly clearTrigger = signal<object | undefined>(undefined);
  readonly interactionType = signal<CommonSearchInteractionType>(
    CommonSearchInteractionType.FromSelection,
  );
  readonly isFocusedOut = signal(false);
  readonly currSelected = signal<AbstractData[]>([]);
  readonly panelVisible = signal(false);
  readonly focused = signal(false);
  readonly lastTypedQuery = signal<string>('');

  readonly myControl = new FormControl<string[]>([]);

  readonly controlValueSignal = toSignal(this.myControl.valueChanges, {
    initialValue: this.myControl.value ?? [],
  });

  readonly errorMessage = computed(() => {
    const errs = this.myControl.errors;
    return errs ? (errs['errors'] as string) : null;
  });

  readonly isTreeView = computed(() => !!this.serviceContext()?.isTreeView);
  readonly placeholder = computed(
    () => this.serviceContext()?.placeholder ?? '',
  );

  readonly panelStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {};
    const minW = this.panelMinWidth() ?? this.minWidth();
    const maxW = this.panelMaxWidth() ?? this.maxWidth();
    if (minW) style['min-width'] = minW;
    if (maxW) style['max-width'] = maxW;
    if (!minW && !maxW) {
      style['width'] = (this.serviceContext()?.panelWidth ?? 300) + 'px';
    }
    return style;
  });

  readonly chipsValue = computed<string[]>(
    () => this.controlValueSignal() ?? [],
  );

  readonly overflowCount = computed(() => {
    const max = this.maxVisibleChips();
    if (!isFinite(max)) return 0;
    return Math.max(0, this.chipsValue().length - max);
  });

  readonly collapsed = computed(() => this.overflowCount() > 0);

  readonly summaryLabel = computed(() => {
    const n = this.chipsValue().length;
    return n === 1 ? '1 Item' : `${n} Items`;
  });

  readonly overflowTooltip = computed(() =>
    this.collapsed() ? this.chipsValue().join(', ') : '',
  );

  readonly labelRaised = computed(
    () =>
      this.focused() ||
      this.chipsValue().length > 0 ||
      this.lastTypedQuery().length > 0,
  );

  readonly gridDisableRule = (row: MultiselectRow): boolean =>
    this.searchContext().disableRules?.grid?.(row) ?? false;

  readonly treeDisableRule = (node: TreeNode): boolean =>
    this.searchContext().disableRules?.tree?.(node) ?? false;

  private readonly visibleResultDisplayTexts = computed<string[]>(() => {
    const ctx = this.serviceContext();
    if (!ctx) return [];
    const primary = ctx.detailFields?.[0]?.name;
    const fallback = ctx.emitField;
    if (this.isTreeView()) {
      const out: string[] = [];
      this.walkTreeLeaves(this.searchResults() as unknown[], (item) => {
        const v = primary ? (item[primary] as string) : '';
        out.push(v && v.length > 0 ? v : (item[fallback] as string));
      });
      return out;
    }
    return this.searchResults().map((d) => {
      const v = primary ? (d[primary] as string) : '';
      return v && v.length > 0 ? v : (d[fallback] as string);
    });
  });

  private readonly visibleResultEmitValues = computed<string[]>(() => {
    const ctx = this.serviceContext();
    if (!ctx) return [];
    const emitKey = ctx.emitField;
    if (this.isTreeView()) {
      const out: string[] = [];
      this.walkTreeLeaves(this.searchResults() as unknown[], (item) => {
        out.push(item[emitKey] as string);
      });
      return out;
    }
    return this.searchResults().map((d) => d[emitKey] as string);
  });

  private readonly visibleTextsSet = computed(
    () => new Set(this.visibleResultDisplayTexts()),
  );
  private readonly visibleValueSet = computed(
    () => new Set(this.visibleResultEmitValues()),
  );

  private readonly searchQuery = signal<string>('');

  private readonly autoComplete = viewChild<AutoComplete>('commonSearch');

  private readonly destroyRef = inject(DestroyRef);
  private readonly dataFacadeService = inject(DataAccessFacadeService);
  private readonly trackingService = inject(TrackingService);

  private formGroupRegistered = false;
  private focusOutTimer: ReturnType<typeof setTimeout> | null = null;

  private emitAutoDeselect(value: string): void {
    if (!value) return;
    this.autoToggle.set({ deselect: value });
    queueMicrotask(() => {
      if (this.autoToggle()?.deselect === value) {
        this.autoToggle.set(undefined);
      }
    });
  }

  constructor() {
    effect(() => {
      const ctx = this.searchContext();
      const base = this.dataFacadeService.getServiceContext(ctx.searchType);
      const merged = ctx.overrideContext
        ? { ...base, ...ctx.overrideContext }
        : base;
      this.serviceContext.set(merged);

      const fg = this.formGroup();
      if (fg && !this.formGroupRegistered) {
        fg.addControl(ctx.searchType, this.myControl);
        this.formGroupRegistered = true;
      }
    });

    effect(() => {
      if (this.disabled()) this.myControl.disable({ emitEvent: false });
      else this.myControl.enable({ emitEvent: false });
    });

    effect(() => {
      const clear = this.clearSelection();
      if (clear !== undefined && clear !== null) this.resetSearch();
    });

    effect(() => {
      const item = this.clearItem();
      if (item) this.emitAutoDeselect(item);
    });

    effect(() => {
      const trigger = this.triggerSelect();
      if (trigger && !this.disabled()) {
        this.searchQuery.set(trigger);
        this.onFocusOut();
      }
    });

    toObservable(this.searchQuery)
      .pipe(
        distinctUntilChanged(),
        debounceTime(300),
        filter((v) => v.length >= this.minLengthForInputValue()),
        switchMap((query) => {
          const ctx = this.serviceContext();
          if (!ctx) return of([]);
          const searchType = this.searchContext().searchType;

          const withFallback = (source$: Observable<unknown[]>) =>
            source$.pipe(
              switchMap((results) => {
                const data = (results as AbstractData[]) ?? [];
                if (data.length > 0) return of(data);
                return this.dataFacadeService
                  .getInitialData(ctx, searchType)
                  .pipe(
                    map((initial) =>
                      Array.isArray(initial) ? (initial as AbstractData[]) : [],
                    ),
                    catchError(() => of([] as AbstractData[])),
                  );
              }),
            );

          if (ctx.initLoadData) {
            return this.isInitDataReady().pipe(
              switchMap(() =>
                withFallback(
                  this.dataFacadeService.getSuggestedData(
                    ctx,
                    searchType,
                    query,
                  ),
                ),
              ),
            );
          }
          return withFallback(
            this.dataFacadeService.getSuggestedData(ctx, searchType, query),
          );
        }),
        catchError(() => {
          this.myControl.setErrors({
            errors: 'System error occurred. Please try again.',
          });
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        const data = results as AbstractData[];
        this.searchResults.set(data);
        this.panelVisible.set(true);
        this.stopAutoCompleteLoading();
        queueMicrotask(() => {
          const query = this.searchQuery();
          const el = this.inputEl();
          if (el && !el.value && query) el.value = query;
        });
        if (data.length === 0) {
          this.myControl.setErrors({
            errors: this.serviceContext()?.errorMessage,
          });
        }
      });

    afterNextRender(() => {
      const allValidators: ValidatorFn[] = [
        ...this.validators(),
        this.validSelectionValidator(),
      ];
      this.myControl.addValidators(allValidators);

      const sCtx = this.serviceContext();
      if (sCtx?.initLoadData) {
        this.dataFacadeService
          .loadInitialData(this.searchContext())
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe();
      }
      this.dataFacadeService.loadPreferences(this.searchContext());

      if (this.focusOnLoad()) {
        this.focusInput();
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.focusOutTimer !== null) {
        clearTimeout(this.focusOutTimer);
        this.focusOutTimer = null;
      }
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query ?? '';
    if (query.length > 0) this.lastTypedQuery.set(query);
    if (query.length === 0 && this.dropdown()) {
      this.openInitialPanel();
      return;
    }
    if (query.length < this.minLengthForInputValue()) return;
    this.searchQuery.set(query);
  }

  onFocusIn(): void {
    if (this.disabled()) return;
    this.isFocusedOut.set(false);
    this.focused.set(true);
    const ctx = this.serviceContext();
    if (!ctx) return;

    if (this.searchResults().length > 0) this.showPanel();
    else if (this.searchQuery() === '') this.openInitialPanel();
  }

  focusInput(): void {
    if (this.disabled()) return;
    this.inputEl()?.focus();
  }

  private openPanel(): void {
    queueMicrotask(() => {
      const ac = this.autoComplete();
      (ac as unknown as { show?: () => void } | undefined)?.show?.();
    });
  }

  onFocusOut(event?: Event): void {
    if (this.disabled()) return;
    const related = (event as FocusEvent | undefined)?.relatedTarget as
      | HTMLElement
      | null
      | undefined;
    if (
      related &&
      (related.closest('.p-autocomplete-overlay') ||
        related.closest('[data-pc-section="dropdown"]'))
    ) {
      return;
    }
    this.isFocusedOut.set(true);
    this.focused.set(false);
    if (this.focusOutTimer !== null) clearTimeout(this.focusOutTimer);
    this.focusOutTimer = setTimeout(() => {
      this.focusOutTimer = null;
      this.panelVisible.set(false);
      this.cancelPendingQuery();
    }, 1000);
  }

  onDropdownButtonClick(event?: { query?: string | null }): void {
    if (this.focusOutTimer !== null) {
      clearTimeout(this.focusOutTimer);
      this.focusOutTimer = null;
    }

    // PrimeNG emits `query: undefined` for the close half of the dropdown
    // toggle. Keep that click as a pure close; the next click will emit an
    // empty/current query and reopen through `onSearch`/`openInitialPanel`.
    if (event && event.query === undefined) return;

    this.isFocusedOut.set(false);
    this.focused.set(true);
    if (this.searchResults().length > 0) this.showPanel();
    else if ((event?.query ?? '') === '') this.openInitialPanel();
  }

  private showPanel(): void {
    this.panelVisible.set(true);
    this.openPanel();
  }

  private openInitialPanel(): void {
    const ctx = this.serviceContext();
    if (!ctx || this.disabled()) return;

    this.isFocusedOut.set(false);
    this.focused.set(true);

    if (this.searchResults().length > 0) {
      this.showPanel();
      return;
    }

    this.dataFacadeService
      .getInitialData(ctx, this.searchContext().searchType)
      .pipe(
        filter((d): d is AbstractData[] => Array.isArray(d) && d.length > 0),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d: AbstractData[]) => {
        this.searchResults.set(d);
        this.stopAutoCompleteLoading();
        this.showPanel();
      });
  }

  private stopAutoCompleteLoading(): void {
    const ac = this.autoComplete() as unknown as
      | { loading?: boolean }
      | undefined;
    if (ac?.loading) ac.loading = false;
  }

  onPanelHide(): void {
    if (this.focusOutTimer !== null) {
      clearTimeout(this.focusOutTimer);
      this.focusOutTimer = null;
    }
    this.panelVisible.set(false);
    // Treat a panel close as a cancel of any in-flight typed query. Without
    // this the next focus replays the stale filter (e.g. user typed "AAPL",
    // blurred, refocused — still saw only "AAPL"). Chips (`currSelected`)
    // are untouched because they're confirmed selections, not filter state.
    this.cancelPendingQuery();
  }

  /** Reset any typed-but-not-committed query so the next open starts fresh. */
  private cancelPendingQuery(): void {
    this.searchQuery.set('');
    this.lastTypedQuery.set('');
    this.searchResults.set([]);
    this.clearInputBox();
  }

  onPanelMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && target.closest('.p-autocomplete-overlay')) {
      event.preventDefault();
    }
  }

  onInputKeyDown(event: KeyboardEvent): void {
    this.interactionType.set(CommonSearchInteractionType.FromTyping);

    const isComma = event.key === ',';
    const isTab = event.key === 'Tab' && !event.shiftKey;
    const isEnter = event.key === 'Enter';
    if (!isComma && !isTab && !isEnter) return;

    const text = this.readInputText();
    if (!text) return;

    if (isEnter) {
      event.preventDefault();
      this.submitInputQuery(text);
      return;
    }

    if (isComma) event.preventDefault();

    const prev = this.myControl.value ?? [];
    if (
      prev.some((v) => v.toLowerCase() === text.toLowerCase()) ||
      prev.length >= this.maxSelection()
    ) {
      this.clearInputBox();
      return;
    }

    this.clearInputBox();
    this.resolveAndAddTokens([text], prev);
  }

  private submitInputQuery(query: string): void {
    this.lastTypedQuery.set(query);
    if (query.length < this.minLengthForInputValue()) return;

    this.isFocusedOut.set(false);
    this.focused.set(true);
    this.panelVisible.set(true);
    this.openPanel();

    if (this.searchQuery() === query) {
      if (this.searchResults().length > 0) this.showPanel();
      return;
    }

    this.searchQuery.set(query);
  }

  onInputPaste(event: ClipboardEvent): void {
    this.interactionType.set(CommonSearchInteractionType.FromPaste);

    const text = event.clipboardData?.getData('text') ?? '';
    const tokens = text
      .split(/[,;\t\n\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (tokens.length === 0) return;
    event.preventDefault();
    this.clearInputBox();

    const prev = this.myControl.value ?? [];
    const existingLower = new Set(prev.map((v) => v.toLowerCase()));
    const maxSel = this.maxSelection();
    const unique = tokens.filter((t) => {
      if (prev.length >= maxSel) return false;
      const key = t.toLowerCase();
      if (existingLower.has(key)) return false;
      existingLower.add(key);
      return true;
    });
    if (unique.length === 0) return;

    this.resolveAndAddTokens(unique, prev);
  }

  onProxySelect(): void {
    const strings = (this.myControl.value ?? []).filter(
      (v): v is string => typeof v === 'string',
    );
    this.myControl.setValue(strings);

    const typed = this.lastTypedQuery();
    if (typed) {
      const resultTexts = this.visibleResultDisplayTexts();
      if (!resultTexts.includes(typed)) {
        this.interactionType.set(CommonSearchInteractionType.FromTyping);
      }
    }

    this.lastTypedQuery.set('');
    this.clearInputBox();
  }

  onChipRemove(event: { originalEvent: Event; value: string }): void {
    const current = (this.myControl.value ?? []).filter(
      (v): v is string => typeof v === 'string',
    );
    if (current.includes(event.value)) {
      this.myControl.setValue(current.filter((v) => v !== event.value));
    }

    const removedData = this.currSelected().find(
      (d) => this.resolveDisplayText(d) === event.value,
    );
    if (removedData) {
      const removedKey = this.resolveEmitKey(removedData);
      const nextData = this.currSelected().filter((d) =>
        removedKey.length > 0
          ? this.resolveEmitKey(d) !== removedKey
          : d !== removedData,
      );
      this.currSelected.set(nextData);
      this.emitCurrentSelectionState();
    }

    this.emitAutoDeselect(event.value);
  }

  onSelectedChipUnchecked(value: string): void {
    const emitKey = this.serviceContext()?.emitField;
    const valueKey = `${value ?? ''}`;
    const match = emitKey
      ? this.currSelected().find((d) => this.resolveEmitKey(d) === valueKey)
      : undefined;
    const displayText = match ? this.resolveDisplayText(match) : value;

    const next = (this.myControl.value ?? []).filter(
      (v) => v !== displayText && v !== value,
    );
    this.myControl.setValue(next);
    this.currSelected.set(
      this.currSelected().filter((d) =>
        emitKey ? this.resolveEmitKey(d) !== valueKey : true,
      ),
    );
    this.emitAutoDeselect(value);
    this.emitCurrentSelectionState();
  }

  private emitCurrentSelectionState(): void {
    const data = this.currSelected();
    const emitField = this.serviceContext()?.emitField;
    const values = emitField
      ? data
          .map((d) => d[emitField])
          .filter(
            (value): value is CommonSearchValue =>
              typeof value === 'string' || typeof value === 'number',
          )
      : [];
    const displayText = data.map((d) => this.resolveDisplayText(d));

    this.emitSelection.emit(values);
    this.resultsChange.emit(data);
    this.dataFacadeService.setPreference(
      this.searchContext(),
      this.getPreferenceData({ data, values, displayText }),
      this.serviceContext()?.isTreeView,
    );
  }

  private resolveEmitKey(d: AbstractData): string {
    const emitField = this.serviceContext()?.emitField;
    if (!emitField) return '';
    const raw = d[emitField];
    return raw === undefined || raw === null ? '' : `${raw}`;
  }

  private resolveDisplayText(d: AbstractData): string {
    const ctx = this.serviceContext();
    const primary = ctx?.detailFields?.[0]?.name;
    const fallback = ctx?.emitField ?? '';
    const v = primary ? (d[primary] as string) : '';
    return v && v.length > 0 ? v : ((d[fallback] as string) ?? '');
  }

  private resolveAndAddTokens(tokens: string[], prev: string[]): void {
    const ctx = this.serviceContext();
    const searchType = this.searchContext().searchType;
    if (!ctx) return;

    if (this.isTreeView()) {
      this.resolveTreeTokens(tokens, prev);
      return;
    }

    const buildQueries = () => {
      const queries$ = tokens.map((token) =>
        this.dataFacadeService.getSuggestedData(ctx, searchType, token).pipe(
          take(1),
          map((results) =>
            this.matchToken(token, results as AbstractData[]),
          ),
          catchError(() =>
            of(null as { display: string; data: AbstractData } | null),
          ),
        ),
      );
      return forkJoin(queries$);
    };

    const source$ = ctx.initLoadData
      ? this.isInitDataReady().pipe(switchMap(() => buildQueries()))
      : buildQueries();

    source$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((resolved) => {
        const accepted = resolved.filter(
          (r): r is { display: string; data: AbstractData } => r !== null,
        );
        if (accepted.length === 0) return;

        const currentChips = this.myControl.value ?? [];
        const existingLower = new Set(
          currentChips.map((v) => v.toLowerCase()),
        );
        const toAdd = accepted.filter(
          (r) => !existingLower.has(r.display.toLowerCase()),
        );
        if (toAdd.length === 0) return;

        const displays = toAdd.map((r) => r.display);
        const records = toAdd.map((r) => r.data);
        const next = [...currentChips, ...displays];

        this.trackFilterModified(prev, next);
        this.myControl.setValue(next);
        this.currSelected.update((cs) => [...cs, ...records]);
        this.lastTypedQuery.set('');
        this.searchQuery.set('');
        this.emitCurrentSelectionState();
      });
  }

  private resolveTreeTokens(tokens: string[], prev: string[]): void {
    const ctx = this.serviceContext();
    if (!ctx) return;
    const primary = ctx.detailFields?.[0]?.name;
    const emitField = ctx.emitField;

    const leaves: { display: string; data: AbstractData }[] = [];
    this.walkTreeLeaves(this.searchResults() as unknown[], (item) => {
      const displayVal = primary ? ((item[primary] as string) ?? '') : '';
      const emitVal = emitField ? ((item[emitField] as string) ?? '') : '';
      leaves.push({
        display: displayVal || emitVal,
        data: item as AbstractData,
      });
    });

    const currentChips = this.myControl.value ?? [];
    const existingLower = new Set(currentChips.map((v) => v.toLowerCase()));
    const maxSel = this.maxSelection();
    const toAdd: { display: string; data: AbstractData }[] = [];

    for (const token of tokens) {
      if (currentChips.length + toAdd.length >= maxSel) break;
      const lower = token.toLowerCase();
      if (existingLower.has(lower)) continue;
      const match = leaves.find(
        (l) =>
          l.display.toLowerCase() === lower ||
          (emitField
            ? ((l.data[emitField] as string) ?? '').toLowerCase() === lower
            : false),
      );
      if (match) {
        existingLower.add(match.display.toLowerCase());
        toAdd.push(match);
      }
    }
    if (toAdd.length === 0) return;

    const displays = toAdd.map((r) => r.display);
    const records = toAdd.map((r) => r.data);
    const next = [...currentChips, ...displays];

    this.trackFilterModified(prev, next);
    this.myControl.setValue(next);
    this.currSelected.update((cs) => [...cs, ...records]);
    this.lastTypedQuery.set('');
    this.searchQuery.set('');
    this.emitCurrentSelectionState();
    this.autoToggle.set({});
  }

  private matchToken(
    token: string,
    results: AbstractData[],
  ): { display: string; data: AbstractData } | null {
    if (results.length === 0) return null;
    const ctx = this.serviceContext();
    const primary = ctx?.detailFields?.[0]?.name;
    const emitField = ctx?.emitField;
    const lower = token.toLowerCase();

    for (const r of results) {
      const displayVal = primary ? ((r[primary] as string) ?? '') : '';
      const emitVal = emitField ? ((r[emitField] as string) ?? '') : '';
      if (
        displayVal.toLowerCase() === lower ||
        emitVal.toLowerCase() === lower
      ) {
        return { display: displayVal || emitVal, data: r };
      }
    }
    const first = results[0];
    const display = this.resolveDisplayText(first);
    return display ? { display, data: first } : null;
  }

  private inputEl(): HTMLInputElement | null {
    const ac = this.autoComplete() as unknown as
      | { el?: ElementRef }
      | undefined;
    const host = ac?.el?.nativeElement as HTMLElement | undefined;
    return (
      host?.querySelector<HTMLInputElement>('input.p-autocomplete-input') ??
      null
    );
  }

  private readInputText(): string {
    return (this.inputEl()?.value ?? '').trim();
  }

  private clearInputBox(): void {
    const el = this.inputEl();
    if (el) el.value = '';
  }

  onSelected(selection: CommonSearchSelection): void {
    const prev = [...(this.myControl.value ?? [])];
    const isMultiSelect =
      !!this.serviceContext()?.multiselect || this.isTreeView();

    if (!isMultiSelect) {
      const uniqueDisplay = Array.from(new Set(selection.displayText));
      const emitKey = this.serviceContext()?.emitField;
      const seen = new Set<string>();
      const uniqueData = selection.data.filter((d) => {
        const key = emitKey ? (d[emitKey] as string) : JSON.stringify(d);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.trackFilterModified(prev, uniqueDisplay);
      this.currSelected.set(uniqueData);
      this.lastTypedQuery.set('');
      this.interactionType.set(CommonSearchInteractionType.FromSelection);
      this.emitSelection.emit(selection.values);
      this.resultsChange.emit(uniqueData);
      this.myControl.setValue(uniqueDisplay);
      this.clearInputBox();
      this.searchQuery.set('');
      this.panelVisible.set(false);
      this.dataFacadeService.setPreference(
        this.searchContext(),
        this.getPreferenceData({
          data: uniqueData,
          values: selection.values,
          displayText: uniqueDisplay,
        }),
        this.serviceContext()?.isTreeView,
      );
      if (selection.values.length > this.maxSelection()) {
        this.myControl.setErrors({ errors: `Max ${this.maxSelection()}` });
      }
      return;
    }

    const visibleTexts = this.visibleTextsSet();
    const preserved = prev.filter((t) => !visibleTexts.has(t));
    const seen = new Set<string>();
    const mergedDisplay: string[] = [];
    for (const t of [...preserved, ...selection.displayText]) {
      if (!seen.has(t)) {
        seen.add(t);
        mergedDisplay.push(t);
      }
    }

    const emitKey = this.serviceContext()?.emitField;
    const visibleValues = this.visibleValueSet();
    const prevDisplaySet = new Set(prev);
    const normalizedCurrentSelected = this.currSelected().filter((d) =>
      prevDisplaySet.has(this.resolveDisplayText(d)),
    );
    const preservedData = normalizedCurrentSelected.filter(
      (d) => !visibleValues.has(emitKey ? (d[emitKey] as string) : ''),
    );
    const dataSeen = new Set<string>();
    const mergedData: AbstractData[] = [];
    for (const d of [...preservedData, ...selection.data]) {
      const key = emitKey ? (d[emitKey] as string) : JSON.stringify(d);
      if (!dataSeen.has(key)) {
        dataSeen.add(key);
        mergedData.push(d);
      }
    }

    this.trackFilterModified(prev, mergedDisplay);

    this.currSelected.set(mergedData);
    this.interactionType.set(CommonSearchInteractionType.FromSelection);
    this.emitSelection.emit(selection.values);
    this.resultsChange.emit(mergedData);

    this.myControl.setValue(mergedDisplay);

    const allTexts = this.visibleResultDisplayTexts();
    const selectedLower = new Set(mergedDisplay.map((t) => t.toLowerCase()));
    const allDisabled =
      allTexts.length > 0 &&
      allTexts.every((t) => selectedLower.has(t.toLowerCase()));
    if (allDisabled) {
      this.clearInputBox();
      this.lastTypedQuery.set('');
      this.searchQuery.set('');
    }

    if (!this.serviceContext()?.multiselect && !this.isTreeView()) {
      this.panelVisible.set(false);
    }

    this.dataFacadeService.setPreference(
      this.searchContext(),
      this.getPreferenceData(selection),
      this.serviceContext()?.isTreeView,
    );

    if (selection.values.length > this.maxSelection()) {
      this.myControl.setErrors({ errors: `Max ${this.maxSelection()}` });
    }
  }

  clearSearch(): void {
    this.clearTrigger.set({});
    this.resetSearch();
  }

  private static readonly SENTINEL_ITEM: AbstractData = {};
  private static readonly EMPTY_SUGGESTIONS: AbstractData[] = [];
  private lastSuggestions: AbstractData[] =
    HdsCommonSearchComponent.EMPTY_SUGGESTIONS;

  /**
   * Feed PrimeNG one sentinel item while `panelVisible` is true so its
   * `handleSuggestionsChange` keeps the overlay open. The actual megamenu
   * (grid/tree) renders in the `#footer` template; the `#item` template is
   * an empty `<span>` so the sentinel itself has no visual footprint.
   * On false→true transitions we return a fresh array reference so PrimeNG
   * picks the change up via ngOnChanges; while it stays open, the same
   * reference is returned to avoid retriggering on every CD cycle.
   */
  get suggestions(): AbstractData[] {
    if (!this.panelVisible()) {
      this.lastSuggestions = HdsCommonSearchComponent.EMPTY_SUGGESTIONS;
      return HdsCommonSearchComponent.EMPTY_SUGGESTIONS;
    }
    if (this.lastSuggestions === HdsCommonSearchComponent.EMPTY_SUGGESTIONS) {
      this.lastSuggestions = [HdsCommonSearchComponent.SENTINEL_ITEM];
    }
    return this.lastSuggestions;
  }

  /** Adds an internal hook class on top of any user-provided panel class. */
  readonly resolvedPanelClass = computed(
    () => `hds-megamenu-overlay ${this.panelClass() ?? ''}`.trim(),
  );

  private walkTreeLeaves(
    nodes: unknown[],
    visit: (item: Record<string, unknown>) => void,
  ): void {
    for (const raw of nodes) {
      const n = raw as {
        items?: Array<{ name: string; value: unknown }>;
        children?: unknown[];
        header?: boolean;
      };
      if (n.children && n.children.length > 0) {
        this.walkTreeLeaves(n.children, visit);
        continue;
      }
      if (n.header) continue;
      const obj: Record<string, unknown> = {};
      for (const it of n.items ?? []) obj[it.name] = it.value;
      visit(obj);
    }
  }

  private resetSearch(): void {
    this.myControl.setValue([]);
    this.searchQuery.set('');
    this.lastTypedQuery.set('');
    this.clearEvent.emit([]);
    this.searchResults.set([]);
    this.currSelected.set([]);
    this.panelVisible.set(false);
    this.clearTrigger.set({});
  }

  private validSelectionValidator(): ValidatorFn {
    return (control: AbstractControl): Record<string, unknown> | null => {
      const hasRequired = this.validators().some(
        (v) => v === Validators.required,
      );
      const value = control.value as string[] | null;
      const isEmpty = !value || value.length === 0;
      if (isEmpty && hasRequired) return { required: true };
      if (
        isEmpty &&
        this.isFocusedOut() &&
        this.lastTypedQuery().length > 0 &&
        this.currSelected().length === 0
      ) {
        return { errors: this.serviceContext()?.errorMessage };
      }
      return null;
    };
  }

  private isInitDataReady(): Observable<boolean> {
    return this.dataFacadeService.initialDataPersisted$.pipe(
      filter((v): v is true => v === true),
      first(),
    );
  }

  private getPreferenceData(selection: CommonSearchSelection): unknown[] {
    const ctx = this.serviceContext();
    if (ctx?.initLoadData && !ctx.isTreeView) return selection.values;
    return selection.data;
  }

  private trackFilterModified(prev: string[], next: string[]): void {
    const event: TrackingEvent = {
      action: TrackingEventName.FilterModified,
      appModule: moduleName,
      additionalAttributes: {
        filterName: this.searchContext().searchType,
        previousValue: JSON.stringify(prev),
        currentValue: JSON.stringify(next),
        interactionType: this.interactionType(),
      },
    };
    this.trackingService.trackEvent(event);
  }
}
