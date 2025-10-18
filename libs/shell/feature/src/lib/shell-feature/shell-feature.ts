import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TradeGrid, TradeData } from '@trade-platform/trade-grid';
import { TradeDataService } from '@trade-platform/shared/data-access';
import { StatsCard } from '@trade-platform/shared/ui-components';

@Component({
  selector: 'lib-shell-feature',
  imports: [CommonModule, TradeGrid, StatsCard],
  templateUrl: './shell-feature.html',
  styleUrl: './shell-feature.css',
})
export class ShellFeature implements OnInit, OnDestroy {
  tradeData: TradeData[] = [];
  totalTrades = 0;
  buyCount = 0;
  sellCount = 0;

  private destroy$ = new Subject<void>();

  constructor(private tradeDataService: TradeDataService) {}

  ngOnInit(): void {
    this.tradeDataService
      .getTrades()
      .pipe(takeUntil(this.destroy$))
      .subscribe((trades) => {
        this.tradeData = trades;
        this.updateStats(trades);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelTrade(tradeId: string): void {
    this.tradeDataService.cancelTrade(tradeId);
  }

  onCancelSelectedTrades(tradeIds: string[]): void {
    if (tradeIds.length > 0) {
      this.tradeDataService.cancelMultipleTrades(tradeIds);
    }
  }

  private updateStats(trades: TradeData[]): void {
    // Only count active trades in stats
    const activeTrades = trades.filter((t) => t.status === 'ACTIVE');
    this.totalTrades = activeTrades.length;
    this.buyCount = activeTrades.filter((t) => t.side === 'BUY').length;
    this.sellCount = activeTrades.filter((t) => t.side === 'SELL').length;
  }
}
