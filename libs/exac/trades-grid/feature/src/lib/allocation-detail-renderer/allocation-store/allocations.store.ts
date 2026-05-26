import { AllocationModel } from '@trade-platform/exac/shared/data';
import { Injectable, signal, computed } from '@angular/core';
import { TradeActivityService } from '@trade-platform/exac/trades-grid/data-access';
import { switchMap, tap, catchError, EMPTY, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface AllocationState {
  allocations: AllocationModel[] | null;
  isLoading: boolean;
  error: string | null;
  showUnallocatedMembers: boolean;
}

/**
 * Signals-based local store for allocation detail data.
 * Replaces the NgRx ComponentStore used in the POC source.
 * Provided at the component level (not root) so each detail row
 * gets its own isolated instance.
 */
@Injectable()
export class AllocationsStore {
  private readonly state = signal<AllocationState>({
    allocations: null,
    isLoading: false,
    error: null,
    showUnallocatedMembers: false,
  });

  public readonly allocations$ = computed(() => this.state().allocations);
  public readonly isLoading$ = computed(() => this.state().isLoading);
  public readonly error$ = computed(() => this.state().error);
  public readonly showUnallocatedMembers$ = computed(
    () => this.state().showUnallocatedMembers,
  );

  public readonly filteredAllocations$ = computed(() => {
    const allocations = this.state().allocations;
    const showUnallocated = this.state().showUnallocatedMembers;
    if (!allocations) return null;
    if (showUnallocated) return allocations;
    return allocations.filter((a) => a.tradeQuantity);
  });

  private readonly loadTrigger$ = new Subject<string>();

  public constructor(
    private readonly tradeActivityService: TradeActivityService,
  ) {
    this.loadTrigger$
      .pipe(
        tap(() => this.setIsLoading(true)),
        switchMap((executionId) =>
          this.tradeActivityService.getAllocationsByExecutionId(executionId).pipe(
            tap((allocations) => this.setAllocations(allocations)),
            catchError((error: HttpErrorResponse) => {
              this.setError(error.message);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
  }

  public loadAllocations(executionId: string): void {
    this.loadTrigger$.next(executionId);
  }

  public setIsLoading(isLoading: boolean): void {
    this.state.update((s) => ({ ...s, isLoading, error: null }));
  }

  public setAllocations(allocations: AllocationModel[]): void {
    this.state.update((s) => ({ ...s, allocations, isLoading: false }));
  }

  public setError(error: string): void {
    this.state.update((s) => ({ ...s, error, isLoading: false }));
  }

  public setShowUnallocatedMembers(showUnallocatedMembers: boolean): void {
    this.state.update((s) => ({ ...s, showUnallocatedMembers }));
  }
}
