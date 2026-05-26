import { signal, computed, Signal } from '@angular/core';
import { TradeModel } from '@trade-platform/exac/shared/data';

export interface TradesGridState {
  trades: TradeModel[];
  isLoadingData: boolean;
  loaded: boolean;
  error: string | null;
  serviceUrl: string;
}

const initialState: TradesGridState = {
  trades: [],
  isLoadingData: false,
  loaded: false,
  error: null,
  serviceUrl: '',
};

export function createTradesGridState() {
  const state = signal<TradesGridState>(initialState);

  const trades: Signal<TradeModel[]> = computed(() => state().trades);
  const isLoadingData: Signal<boolean> = computed(() => state().isLoadingData);
  const isLoaded: Signal<boolean> = computed(() => state().loaded);
  const error: Signal<string | null> = computed(() => state().error);
  const serviceUrl: Signal<string> = computed(() => state().serviceUrl);

  function setLoading(): void {
    state.update((s) => ({ ...s, isLoadingData: true, loaded: false, error: null }));
  }

  function setTrades(trades: TradeModel[]): void {
    state.update((s) => ({ ...s, trades, isLoadingData: false, loaded: true, error: null }));
  }

  function setError(error: string): void {
    state.update((s) => ({ ...s, isLoadingData: false, loaded: true, error }));
  }

  function clearTrades(): void {
    state.set(initialState);
  }

  function setServiceUrl(url: string): void {
    state.update((s) => ({ ...s, serviceUrl: url }));
  }

  return { trades, isLoadingData, isLoaded, error, serviceUrl, setLoading, setTrades, setError, clearTrades, setServiceUrl };
}
