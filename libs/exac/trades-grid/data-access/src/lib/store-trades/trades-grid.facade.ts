import { Injectable, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { createTradesGridState } from './trades-grid.state';
import { TradeActivityService } from '../services/trade-activity.service';
import { TradeSearchRequest } from '@trade-platform/exac/trades-grid/data';
import { TradeModel } from '@trade-platform/exac/shared/data';

@Injectable({ providedIn: 'root' })
export class TradesGridFacade {
  private readonly service = inject(TradeActivityService);
  private readonly state = createTradesGridState();

  public readonly trades = this.state.trades;
  public readonly isLoadingData = this.state.isLoadingData;
  public readonly isLoaded = this.state.isLoaded;
  public readonly error = this.state.error;

  public loadTrades(request: TradeSearchRequest): void {
    this.state.setLoading();
    this.service
      .getTrades(request)
      .pipe(
        catchError((err) => {
          const msg = err?.message ?? 'Unknown error loading trades';
          this.state.setError(msg);
          return of([] as TradeModel[]);
        }),
      )
      .subscribe((trades) => {
        if (trades.length > 0 || !this.state.error()) {
          this.state.setTrades(trades);
        }
      });
  }

  public clearTrades(): void {
    this.state.clearTrades();
  }
}
