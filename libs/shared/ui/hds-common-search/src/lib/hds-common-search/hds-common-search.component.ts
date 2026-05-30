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
  merge,
  Observable,
  of,
  startWith,
  Subject,
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
import { PanelCoordinatorService } from '../data-access/panel-coordinator.service';
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
  /** Mirrors the actual DOM input value — used for label-raised state so the
   * float label stays up while the user has visible text, even if
   * `lastTypedQuery` was reset by blur/panel-hide cleanup. */
  readonly inputValue = signal<string>('');
  readonly csvMode = signal(false);
  readonly csvText = signal<string>('');

  readonly myControl = new FormControl<string[]>([]);

  readonly controlValueSignal = toSignal(this.myControl.valueChanges, {
    initialValue: this.myControl.value ?? [],
  });

  // Reactive bridge: statusChanges fires whenever setErrors/clearErrors/validators run.
  // Without this, errorMessage computed would have zero signal dependencies and
  // cache its initial null value forever, never showing validation errors.
  private readonly _controlStatus = toSignal(
    this.myControl.statusChanges.pipe(startWith(this.myControl.status)),
    { initialValue: this.myControl.status },
  );

  readonly errorMessage = computed(() => {
    void this._controlStatus(); // establish reactive dependency
    const errs = this.myControl.errors;
    return errs ? (errs['errors'] as string) : null;
  });

  readonly isTreeView = computed(() => !!this.serviceContext()?.isTreeView);
  readonly placeholder = computed(
    () => this.serviceContext()?.placeholder ?? '',
  );

  /** Measured width of the autocomplete trigger element in px — updated each
   * time the panel opens. Used to pin the overlay panel width to the input. */
  private readonly triggerWidth = signal<number>(0);

  readonly panelStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {};
    // Consumer-provided sizing wins if given.
    const minW = this.panelMinWidth() ?? this.minWidth();
    const maxW = this.panelMaxWidth() ?? this.maxWidth();
    if (minW) style['min-width'] = minW;
    if (maxW) style['max-width'] = maxW;
    // Otherwise pin both min-width AND max-width to the trigger's measured
    // width. PrimeNG anchors the overlay at the trigger's left edge — letting
    // the panel grow wider (e.g. p-tree's min-content layout in tree views)
    // overflows into adjacent inputs and trips PrimeNG's viewport-overflow
    // flip, shifting the panel off the trigger.
    const tw = this.triggerWidth();
    if (!minW && tw > 0) style['min-width'] = tw + 'px';
    if (!maxW && tw > 0) style['max-width'] = tw + 'px';
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

  /** Always true when chips exist — hides PrimeNG's internal chip rendering. */
  readonly collapsed = computed(() => this.chipsValue().length > 0);

  /** True when chips exceed maxVisibleChips — show "N Items" summary instead of individual chips. */
  readonly showAsSummary = computed(() => this.overflowCount() > 0);

  readonly summaryLabel = computed(() => {
    const n = this.chipsValue().length;
    return n === 1 ? '1 Item' : `${n} Items`;
  });

  readonly overflowTooltip = computed(() =>
    this.showAsSummary() ? this.chipsValue().join(', ') : '',
  );

  readonly labelRaised = computed(
    () =>
      this.focused() ||
      this.chipsValue().length > 0 ||
      this.lastTypedQuery().length > 0 ||
      this.inputValue().length > 0,
  );

  readonly gridDisableRule = (row: MultiselectRow): boolean =>
    this.searchContext().disableRules?.grid?.(row) ?? false;

  readonly treeDisableRule = (node: TreeNode): boolean =>
    this.searchContext().disableRules?.tree?.(node) ?? false;

  private readonly visibleResultDisplayTexts = computed<string[]>(() => {
    const ctx = this.serviceContext();
    if (!ctx) return [];
    const primary = ctx.chipDisplayField ?? ctx.detailFields?.[0]?.name;
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
    if (this.isTreeView()) {
      const out: string[] = [];
      this.walkTreeLeaves(this.searchResults() as unknown[], (item) => {
        out.push(this.resultIdentity(item as AbstractData));
      });
      return out;
    }
    return this.searchResults().map((d) => this.resultIdentity(d));
  });

  private readonly visibleTextsSet = computed(
    () => new Set(this.visibleResultDisplayTexts()),
  );
  private readonly visibleValueSet = computed(
    () => new Set(this.visibleResultEmitValues()),
  );

  private readonly searchQuery = signal<string>('');
  /** Immediate-fire trigger for Enter / explicit submit — bypasses the
   * typing debounce. Subscribers see the new query and the switchMap
   * cancels any in-flight debounced search. */
  private readonly immediateSearch$ = new Subject<string>();

  private readonly autoComplete = viewChild<AutoComplete>('commonSearch');
  private readonly gridResult =
    viewChild<HdsGridViewResultComponent>('gridResultRef');
  private readonly treeResult =
    viewChild<HdsTreeViewResultComponent>('treeResultRef');

  private readonly destroyRef = inject(DestroyRef);
  private readonly dataFacadeService = inject(DataAccessFacadeService);
  private readonly trackingService = inject(TrackingService);
  private readonly panelCoordinator = inject(PanelCoordinatorService);

  private formGroupRegistered = false;
  private focusOutTimer: ReturnType<typeof setTimeout> | null = null;
  private panelToken: symbol | null = null;
  private chipRemoveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChipRemove: { originalEvent: Event; value: string } | null =
    null;
  private csvModeEntryGuard = false;

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
        // Mark as focused-out without starting the 1000ms close timer —
        // onFocusOut() would schedule cancelPendingQuery which wipes state
        // a second after a programmatic trigger, not the desired behavior.
        this.isFocusedOut.set(true);
        this.focused.set(false);
      }
    });

    // Skip the chip remove icon in tab navigation — chips are removable via
    // the X button but we don't want it stealing focus during keyboard tab
    // traversal of the form. PrimeNG renders the chips internally so the
    // tabindex must be applied via DOM after each chip change.
    effect(() => {
      this.chipsValue(); // dependency
      queueMicrotask(() => this.setChipRemoveTabindex());
    });

    // Two sources merge into one search pipeline:
    //  • Debounced typing stream — fires 150ms after the user stops typing.
    //  • Immediate Enter stream — fires synchronously when the user submits.
    // switchMap further down cancels any in-flight prior search so the
    // user always sees results from the freshest query.
    const typed$ = toObservable(this.searchQuery).pipe(
      distinctUntilChanged(),
      // 150ms is the sweet spot — fast enough to feel responsive,
      // slow enough to avoid firing on every keystroke.
      debounceTime(150),
    );
    merge(typed$, this.immediateSearch$.asObservable())
      .pipe(
        // Always require a non-empty query — the empty-input path is owned
        // by `openInitialPanel` (chevron / focus). Without this, callers
        // that pass `minLengthForInputValue=0` would let toObservable's
        // initial '' emission through on mount, eagerly auto-opening the
        // panel and making the next chevron click read as a close.
        filter((v) => v.length > 0 && v.length >= this.minLengthForInputValue()),
        switchMap((query) => {
          const ctx = this.serviceContext();
          if (!ctx) return of([]);
          const searchType = this.searchContext().searchType;
          const dsf = this.searchContext().dataSourceFn;
          // No isInitDataReady gate — services that pre-load (BrokersService,
          // PersonSearchService) handle their own cache miss inside search().
          // Gating here caused typed queries to wait for the initial HTTP and
          // race with debounce, producing the "only Enter triggers search" bug.
          return this.dataFacadeService.getSuggestedData(ctx, searchType, query, dsf);
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
      if (this.chipRemoveTimer !== null) {
        clearTimeout(this.chipRemoveTimer);
        this.chipRemoveTimer = null;
      }
      this.releaseCoordinator();
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query ?? '';
    // Track the live input value so labelRaised stays correct even after
    // blur cleanup wipes lastTypedQuery.
    this.inputValue.set(query);
    if (query.length > 0) {
      this.lastTypedQuery.set(query);
      // Reactive to typing: if the input is squeezed, scroll chips left
      // immediately so the user has typing room — same action as focus,
      // no waiting for re-focus. The helper is a no-op when input is
      // already ≥ 50% of the container.
      queueMicrotask(() => this.maybeScrollChipsForInput());
    }
    if (query.length === 0 && this.dropdown()) {
      this.openInitialPanel();
      return;
    }
    if (query.length < this.minLengthForInputValue()) return;
    this.searchQuery.set(query);
  }

  /**
   * Focus opens the panel. Same flow as `toggleDropdown`:
   * - cached results → show them
   * - empty → load iprefs (initial data) and show
   * Consistent regardless of how the input got focus (tab, click, label click).
   */
  onFocusIn(): void {
    if (this.disabled()) return;
    if (this.focusOutTimer !== null) {
      clearTimeout(this.focusOutTimer);
      this.focusOutTimer = null;
    }
    this.isFocusedOut.set(false);
    this.focused.set(true);
    const ctx = this.serviceContext();
    if (!ctx) return;

    if (this.searchResults().length > 0) this.showPanel();
    else this.openInitialPanel();

    // If chips have squeezed the input below 50% of the container width,
    // scroll the chip area to the left so the user has typing space.
    // One-shot on focus — does not race with PrimeNG's chip animations.
    queueMicrotask(() => this.maybeScrollChipsForInput());
  }

  focusInput(): void {
    if (this.disabled()) return;
    this.inputEl()?.focus();
  }

  private openPanel(): void {
    // setTimeout(0) — runs AFTER Angular CD propagates the new sentinel
    // suggestion to PrimeNG. queueMicrotask ran BEFORE CD, so PrimeNG saw
    // empty suggestions and bailed (the panel never opened on first focus
    // with no iprefs).
    setTimeout(() => {
      this.measureTriggerWidth();
      const ac = this.autoComplete();
      (ac as unknown as { show?: () => void } | undefined)?.show?.();
    }, 0);
  }

  /** Read the autocomplete container's current pixel width and push it into
   * the triggerWidth signal so panelStyle can pin the overlay to match. */
  private measureTriggerWidth(): void {
    const ac = this.autoComplete() as unknown as
      | { el?: ElementRef<HTMLElement> }
      | undefined;
    const host = ac?.el?.nativeElement;
    if (!host) return;
    const width = host.getBoundingClientRect().width;
    if (width > 0 && width !== this.triggerWidth()) {
      this.triggerWidth.set(width);
    }
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
    // Restore chip scroll to start so chips are visible from the left when
    // the input isn't focused. Symmetric with the focus-time scroll-left.
    queueMicrotask(() => this.resetChipScroll());
    if (this.focusOutTimer !== null) clearTimeout(this.focusOutTimer);
    // 200ms is enough to capture click-on-suggestion blur→focus race while
    // feeling responsive on real blurs. 1000ms (old default) made the input
    // feel "stuck" after typing.
    this.focusOutTimer = setTimeout(() => {
      this.focusOutTimer = null;
      this.panelVisible.set(false);
      this.cancelPendingQuery();
    }, 200);
  }

  toggleDropdown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;

    if (this.focusOutTimer !== null) {
      clearTimeout(this.focusOutTimer);
      this.focusOutTimer = null;
    }

    // PrimeNG's `hide()` defers `overlayVisible=false` via setTimeout(0), so
    // its `overlayVisible` lags our `panelVisible` after a close. Trust the
    // synchronous signal instead — otherwise a fast reopen click is misread
    // as a second close.
    if (this.panelVisible()) {
      this.closePanel();
      return;
    }

    this.isFocusedOut.set(false);
    this.focused.set(true);
    if (this.searchResults().length > 0) this.showPanel();
    else this.openInitialPanel();
  }

  private showPanel(): void {
    const wasHidden = !this.panelVisible();
    this.panelVisible.set(true);
    this.openPanel();
    if (wasHidden) this.acquireCoordinator();
  }

  private closePanel(): void {
    this.panelVisible.set(false);
    const ac = this.autoComplete() as unknown as
      | { hide?: (isFocus?: boolean) => void }
      | undefined;
    // hide(false): do NOT refocus the input — PrimeNG's hide(true) defers a
    // focus() via setTimeout(0) which triggers onFocusIn → openInitialPanel,
    // re-opening the panel we just closed. The chevron's mousedown.preventDefault
    // already keeps focus stable.
    // Note: ac.hide() fires PrimeNG's (onHide) synchronously → onPanelHide(),
    // which handles cancelPendingQuery() and releaseCoordinator(). Do not
    // duplicate those calls here or they run twice in the same tick.
    ac?.hide?.();
  }

  /** Close requested by the coordinator (another panel in the same form
   * group is opening). Identical to `closePanel` except we ask PrimeNG to
   * skip the refocus that `hide(true)` does — otherwise we'd yank focus away
   * from the panel that's about to open. */
  private silentClose(): void {
    this.panelVisible.set(false);
    const ac = this.autoComplete() as unknown as
      | { hide?: (isFocus?: boolean) => void }
      | undefined;
    // Same as closePanel: onPanelHide handles cancelPendingQuery + releaseCoordinator.
    ac?.hide?.();
  }

  private acquireCoordinator(): void {
    const fg = this.formGroup();
    if (!fg) return;
    // Release our own slot first so `acquire` doesn't find the stale entry
    // and call our own `silentClose` back on ourselves.
    this.releaseCoordinator();
    this.panelToken = this.panelCoordinator.acquire(fg, () =>
      this.silentClose(),
    );
  }

  private releaseCoordinator(): void {
    const fg = this.formGroup();
    if (!fg || this.panelToken === null) return;
    this.panelCoordinator.release(fg, this.panelToken);
    this.panelToken = null;
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

    this.loadInitialResults();
  }

  /**
   * Load iprefs (preference-backed initial results) and open the panel.
   * Always opens — even if iprefs returns empty — so the user sees a
   * consistent panel state (the grid/tree handles the "no results" view).
   */
  private loadInitialResults(): void {
    const ctx = this.serviceContext();
    if (!ctx || this.disabled()) return;

    const sCtx = this.searchContext();
    this.dataFacadeService
      .getInitialData(ctx, sCtx.searchType, sCtx.initialDataFn, sCtx.dataSourceFn)
      .pipe(
        map((d) => (Array.isArray(d) ? (d as AbstractData[]) : [])),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d) => {
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
    this.releaseCoordinator();
  }

  /** Reset any typed-but-not-committed query so the next open starts fresh. */
  private cancelPendingQuery(): void {
    this.searchQuery.set('');
    this.lastTypedQuery.set('');
    this.searchResults.set([]);
    // Do NOT clear the DOM input here — that wipes text the user may still need.
    // clearInputBox() is only appropriate on explicit resets (resetSearch/clearSearch)
    // and after a confirmed selection.
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

  /**
   * Enter / explicit-submit path. Fires the search immediately, bypassing
   * the 150ms typing debounce. If a debounced search is still pending for
   * a different query, the switchMap in the search pipeline cancels it.
   */
  private submitInputQuery(query: string): void {
    this.lastTypedQuery.set(query);
    if (query.length < this.minLengthForInputValue()) return;

    this.isFocusedOut.set(false);
    this.focused.set(true);
    this.panelVisible.set(true);
    this.openPanel();

    // Keep searchQuery in sync so the debounced stream's distinctUntilChanged
    // doesn't re-fire the same query 150ms later.
    this.searchQuery.set(query);
    // Fire NOW via the immediate stream — bypasses debounceTime entirely.
    this.immediateSearch$.next(query);
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
    // Defer removal to allow dblclick detection. If the user is
    // double-clicking a chip to enter CSV mode, we cancel the removal.
    if (this.chipRemoveTimer) clearTimeout(this.chipRemoveTimer);
    this.pendingChipRemove = event;
    this.chipRemoveTimer = setTimeout(() => {
      this.chipRemoveTimer = null;
      this.processPendingChipRemove();
    }, 250);
  }

  private processPendingChipRemove(): void {
    const event = this.pendingChipRemove;
    this.pendingChipRemove = null;
    if (!event) return;

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
    const valueKey = `${value ?? ''}`;
    // Match by emit key OR display text — our custom chips pass display text,
    // while the grid/tree chipRemoved output passes the emit value.
    const match = this.currSelected().find(
      (d) =>
        this.resolveEmitKey(d) === valueKey ||
        this.resolveDisplayText(d) === valueKey,
    );
    const displayText = match ? this.resolveDisplayText(match) : value;
    const emitValue = match ? this.resolveEmitKey(match) : value;

    const next = (this.myControl.value ?? []).filter(
      (v) => v !== displayText && v !== value,
    );
    this.myControl.setValue(next);

    if (match) {
      this.currSelected.set(
        this.currSelected().filter((d) =>
          emitValue.length > 0
            ? this.resolveEmitKey(d) !== emitValue
            : d !== match,
        ),
      );
    }

    this.emitAutoDeselect(displayText);
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

  private resultIdentity(d: AbstractData): string {
    return this.resolveEmitKey(d) || this.resolveDisplayText(d);
  }

  private resolveDisplayText(d: AbstractData): string {
    const ctx = this.serviceContext();
    const chip = ctx?.chipDisplayField;
    const primary = chip ?? ctx?.detailFields?.[0]?.name;
    const fallback = ctx?.emitField ?? '';
    const v = primary ? (d[primary] as string) : '';
    return v && v.length > 0 ? v : ((d[fallback] as string) ?? '');
  }

  private resolveAndAddTokens(tokens: string[], prev: string[]): void {
    const ctx = this.serviceContext();
    const sCtx = this.searchContext();
    const searchType = sCtx.searchType;
    const dsf = sCtx.dataSourceFn;
    if (!ctx) return;

    if (this.isTreeView()) {
      this.resolveTreeTokens(tokens, prev);
      return;
    }

    const buildQueries = () => {
      const queries$ = tokens.map((token) =>
        this.dataFacadeService.getSuggestedData(ctx, searchType, token, dsf).pipe(
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

    const source$ = buildQueries();

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

  /** PrimeNG's `(keydown)` listener on the inner input calls
   * `event.stopPropagation()` for ArrowDown/Up/Left/Right/Escape, so our
   * own `(keydown)` on `<p-autocomplete>` never sees them. PrimeNG emits the
   * raw event via the `onInputKeydown` output *before* its switch, which is
   * how we intercept those keys here. */
  onInputKeydownEarly(event: KeyboardEvent): void {
    if (!this.panelVisible()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
      return;
    }
    if (event.key === 'ArrowDown' && this.focusPanelStart()) {
      event.preventDefault();
    }
  }

  private focusPanelStart(): boolean {
    if (this.isTreeView()) {
      const tree = this.treeResult();
      if (tree) {
        tree.focusFirstNode();
        return true;
      }
      return false;
    }
    const grid = this.gridResult();
    if (grid) {
      grid.focusFirstRow();
      return true;
    }
    return false;
  }

  onPanelEscape(): void {
    this.closePanel();
    this.focusInput();
  }

  /** Tab pressed inside the megamenu panel — pop out of the body-appended
   * overlay and move focus to the next (or previous) form control as if
   * Tab had been pressed on the input itself. */
  onPanelTabOut(shiftKey: boolean): void {
    const input = this.inputEl();
    this.closePanel();
    if (!input) return;
    // Defer one microtask so the close-side signal updates settle before we
    // shift focus.
    queueMicrotask(() => {
      const tabbable = this.documentTabbable();
      const idx = tabbable.indexOf(input);
      if (idx === -1) return;
      const next = shiftKey ? tabbable[idx - 1] : tabbable[idx + 1];
      next?.focus();
    });
  }

  private documentTabbable(): HTMLElement[] {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    ).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
  }

  onChipsDblClick(): void {
    // Cancel any pending chip removal — this click was part of a dblclick,
    // not a deliberate single-click remove.
    if (this.chipRemoveTimer) {
      clearTimeout(this.chipRemoveTimer);
      this.chipRemoveTimer = null;
      this.pendingChipRemove = null;
    }

    const chips = this.chipsValue();
    if (chips.length === 0) return;
    if (this.panelVisible()) this.closePanel();
    const csv = chips.join(', ');
    this.csvText.set(csv);
    // Guard against PrimeNG's focus management causing an immediate blur
    // that would trigger exitCsvMode and clear the text.
    this.csvModeEntryGuard = true;
    this.csvMode.set(true);
    const el = this.inputEl();
    if (el) {
      el.value = csv;
      el.focus();
      el.select();
    }
    setTimeout(() => {
      this.csvModeEntryGuard = false;
    }, 200);
  }

  copyCsv(): void {
    const text = this.csvText() || this.inputEl()?.value || '';
    this.writeToClipboard(text);
    this.exitCsvMode();
  }

  cutCsv(): void {
    const text = this.csvText() || this.inputEl()?.value || '';
    this.writeToClipboard(text);
    this.resetSearch();
    this.exitCsvMode();
  }

  private writeToClipboard(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() =>
        this.fallbackCopy(text),
      );
    } else {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  exitCsvMode(): void {
    if (!this.csvMode() || this.csvModeEntryGuard) return;
    this.csvMode.set(false);
    this.csvText.set('');
    this.clearInputBox();
    this.searchQuery.set('');
    this.lastTypedQuery.set('');
  }

  onCsvKeydown(event: KeyboardEvent): void {
    if (!this.csvMode()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.exitCsvMode();
    }
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

  /** Set tabindex=-1 on PrimeNG's per-chip remove icons so keyboard tab
   * navigation skips them — chips are still removable via mouse click
   * or the Backspace key on the input. */
  private setChipRemoveTabindex(): void {
    const ac = this.autoComplete() as unknown as
      | { el?: ElementRef }
      | undefined;
    const host = ac?.el?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    host
      .querySelectorAll<HTMLElement>('.p-autocomplete-chip-icon')
      .forEach((el) => {
        el.tabIndex = -1;
      });
  }

  /**
   * Called on focus. If the last <li> (the typing input chip) has been
   * squeezed below 50% of the chip container's width by accumulated chips,
   * scroll the container to the left by half its width so the input has
   * room to type. One-shot — only on focus, never on chip changes.
   */
  private maybeScrollChipsForInput(): void {
    const ac = this.autoComplete() as unknown as
      | { el?: ElementRef }
      | undefined;
    const host = ac?.el?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    const container = host.querySelector<HTMLElement>(
      '.p-autocomplete-input-multiple',
    );
    const inputChip = container?.querySelector<HTMLElement>(
      '.p-autocomplete-input-chip',
    );
    if (!container || !inputChip) return;

    const containerWidth = container.offsetWidth;
    const inputWidth = inputChip.offsetWidth;
    const threshold = containerWidth * 0.5;

    if (inputWidth < threshold) {
      container.scrollLeft = containerWidth * 0.5;
    }
  }

  /** Called on blur. Restore chip scroll to 0 so chips are visible from
   * the left edge when the input isn't focused. */
  private resetChipScroll(): void {
    const ac = this.autoComplete() as unknown as
      | { el?: ElementRef }
      | undefined;
    const host = ac?.el?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    const container = host.querySelector<HTMLElement>(
      '.p-autocomplete-input-multiple',
    );
    if (!container) return;
    container.scrollLeft = 0;
  }

  private readInputText(): string {
    return (this.inputEl()?.value ?? '').trim();
  }

  private clearInputBox(): void {
    const el = this.inputEl();
    if (el) el.value = '';
    this.inputValue.set('');
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
    const selectionTextSet = new Set(selection.displayText);
    const prevSet = new Set(prev);

    // Order chips by selection time: kept items hold their original position
    // (so existing chips don't shuffle when a new pick lands), and newly
    // checked items append at the end in the order the grid/tree emitted
    // them — which equals click order when the user is selecting one at a
    // time.
    const mergedDisplay: string[] = [];
    for (const t of prev) {
      if (!visibleTexts.has(t) || selectionTextSet.has(t)) {
        mergedDisplay.push(t);
      }
    }
    for (const t of selection.displayText) {
      if (!prevSet.has(t)) mergedDisplay.push(t);
    }

    const prevDataByDisplay = new Map<string, AbstractData>();
    for (const d of this.currSelected()) {
      prevDataByDisplay.set(this.resolveDisplayText(d), d);
    }
    const mergedData: AbstractData[] = [];
    for (const t of prev) {
      if (!visibleTexts.has(t) || selectionTextSet.has(t)) {
        const d = prevDataByDisplay.get(t);
        if (d) mergedData.push(d);
      }
    }
    for (const d of selection.data) {
      const text = this.resolveDisplayText(d);
      if (!prevSet.has(text)) mergedData.push(d);
    }

    this.trackFilterModified(prev, mergedDisplay);

    this.currSelected.set(mergedData);
    this.interactionType.set(CommonSearchInteractionType.FromSelection);
    this.emitSelection.emit(selection.values);
    this.resultsChange.emit(mergedData);

    this.myControl.setValue(mergedDisplay);

    const visibleValuesAfterSelection = this.visibleResultEmitValues().filter(
      (key) => key.length > 0,
    );
    const selectedValues = new Set(
      mergedData.map((d) => this.resultIdentity(d)).filter(Boolean),
    );
    const allDisabled =
      visibleValuesAfterSelection.length > 0 &&
      visibleValuesAfterSelection.every((key) => selectedValues.has(key));
    if (allDisabled) {
      this.clearInputBox();
      this.lastTypedQuery.set('');
      this.searchQuery.set('');
      this.searchResults.set([]);
      this.loadInitialResults();
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
  private static readonly SENTINEL_SUGGESTIONS: AbstractData[] = [
    HdsCommonSearchComponent.SENTINEL_ITEM,
  ];

  /**
   * Feed PrimeNG one sentinel item while `panelVisible` is true so its
   * `handleSuggestionsChange` keeps the overlay open. The actual megamenu
   * (grid/tree) renders in the `#footer` template; the `#item` template is
   * an empty `<span>` so the sentinel itself has no visual footprint.
   *
   * Using a computed signal ensures the same array reference is returned while
   * `panelVisible` stays stable — PrimeNG only sees a new reference when the
   * panel opens or closes, preventing spurious ngOnChanges triggers.
   */
  readonly suggestions = computed<AbstractData[]>(() =>
    this.panelVisible()
      ? HdsCommonSearchComponent.SENTINEL_SUGGESTIONS
      : HdsCommonSearchComponent.EMPTY_SUGGESTIONS,
  );

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
    this.inputValue.set('');
    this.clearEvent.emit([]);
    this.searchResults.set([]);
    this.currSelected.set([]);
    this.panelVisible.set(false);
    this.clearTrigger.set({});
    // Reset to undefined so a newly created grid/tree child doesn't see
    // a stale truthy value and fire its clear effect on mount.
    queueMicrotask(() => this.clearTrigger.set(undefined));
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
