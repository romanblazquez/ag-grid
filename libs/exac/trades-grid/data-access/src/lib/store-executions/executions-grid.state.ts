import { signal, computed, Signal } from '@angular/core';
import { ExecutionModel } from '@trade-platform/exac/shared/data';

export interface ExecutionsGridState {
  executions: ExecutionModel[];
  isLoadingData: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: ExecutionsGridState = {
  executions: [],
  isLoadingData: false,
  loaded: false,
  error: null,
};

export function createExecutionsGridState() {
  const state = signal<ExecutionsGridState>(initialState);

  const executions: Signal<ExecutionModel[]> = computed(() => state().executions);
  const isLoadingData: Signal<boolean> = computed(() => state().isLoadingData);
  const isLoaded: Signal<boolean> = computed(() => state().loaded);
  const error: Signal<string | null> = computed(() => state().error);

  function setLoading(): void {
    state.update((s) => ({ ...s, isLoadingData: true, loaded: false, error: null }));
  }

  function setExecutions(executions: ExecutionModel[]): void {
    state.update((s) => ({ ...s, executions, isLoadingData: false, loaded: true, error: null }));
  }

  function setError(error: string): void {
    state.update((s) => ({ ...s, isLoadingData: false, loaded: true, error }));
  }

  function clearExecutions(): void {
    state.set(initialState);
  }

  return { executions, isLoadingData, isLoaded, error, setLoading, setExecutions, setError, clearExecutions };
}
