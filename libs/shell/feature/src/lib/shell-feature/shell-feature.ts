import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TradeGrid, TradeData, PersonService, CancellationRequest } from '@trade-platform/trade-grid';
import { TradeDataService } from '@trade-platform/shared/data-access';
import { StatsCard, ThemeSwitcher } from '@trade-platform/shared/ui-components';
import { ExacTradesSearchComponent } from '@trade-platform/exac/trades-search/feature';
import { TradesSearchFacadeService } from '@trade-platform/exac/trades-search/data-access';

@Component({
  selector: 'lib-shell-feature',
  imports: [CommonModule, TradeGrid, StatsCard, ThemeSwitcher, ExacTradesSearchComponent],
  templateUrl: './shell-feature.html',
  styleUrl: './shell-feature.css',
})
export class ShellFeature implements OnInit, OnDestroy {
  tradeData: TradeData[] = [];
  totalTrades = 0;
  buyCount = 0;
  sellCount = 0;
  currentTheme = 'dark';

  private destroy$ = new Subject<void>();
  private tradeDataService = inject(TradeDataService);
  private tradesSearchFacade = inject(TradesSearchFacadeService);

  // Enhanced person service with more comprehensive data
  personService: PersonService = {
    getPersonById: (id: string) => {
      const persons = this.personService.getAllPersons();
      return persons.find(p => p.id === id);
    },
    getAllPersons: () => [
      { id: 'user1', fullName: 'John Smith', initials: 'JS' },
      { id: 'user2', fullName: 'Jane Doe', initials: 'JD' },
      { id: 'user3', fullName: 'Michael Johnson', initials: 'MJ' },
      { id: 'user4', fullName: 'Sarah Wilson', initials: 'SW' },
      { id: 'user5', fullName: 'David Brown', initials: 'DB' },
      { id: 'admin1', fullName: 'Alex Thompson', initials: 'AT' },
      { id: 'admin2', fullName: 'Maria Garcia', initials: 'MG' },
      { id: 'supervisor1', fullName: 'Robert Chen', initials: 'RC' },
      { id: 'supervisor2', fullName: 'Emily Davis', initials: 'ED' },
      { id: 'trader1', fullName: 'James Wilson', initials: 'JW' },
    ]
  };

  ngOnInit(): void {
    this.tradeDataService
      .getTrades()
      .pipe(takeUntil(this.destroy$))
      .subscribe((trades) => {
        this.tradeData = trades;
        this.updateStats(trades);
      });

    this.tradesSearchFacade.searches$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        console.log('[trades-search] dispatched', result.view, result.request);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelTrade(tradeId: string): void {
    // In a real app, you'd get the current user from an auth service
    const currentUser = 'user2'; // Simulating current logged-in user
    this.tradeDataService.cancelTrade(tradeId, currentUser);
  }

  onCancelSelectedTrades(tradeIds: string[]): void {
    if (tradeIds.length > 0) {
      // In a real app, you'd get the current user from an auth service
      const currentUser = 'user2'; // Simulating current logged-in user
      this.tradeDataService.cancelMultipleTrades(tradeIds, currentUser);
    }
  }

  onTradesConfirmedCancellation(request: CancellationRequest): void {
    console.log('Confirmed cancellation:', request);
    
    // In a real app, you'd get the current user from an auth service
    const currentUser = 'user2'; // Simulating current logged-in user
    
    if (request.tradeIds.length > 0) {
      this.tradeDataService.cancelMultipleTrades(request.tradeIds, currentUser);
      
      // Log some analytics or notifications
      console.log(`Successfully cancelled ${request.tradeIds.length} trade${request.tradeIds.length > 1 ? 's' : ''}`);
      
      // Could emit notifications, show success toasts, etc.
    }
  }

  onThemeChanged(themeName: string): void {
    this.currentTheme = themeName;
    console.log(`Theme changed to: ${themeName}`);
  }

  private updateStats(trades: TradeData[]): void {
    // Only count active trades in stats
    const activeTrades = trades.filter((t) => t.status === 'ACTIVE');
    this.totalTrades = activeTrades.length;
    this.buyCount = activeTrades.filter((t) => t.side === 'BUY').length;
    this.sellCount = activeTrades.filter((t) => t.side === 'SELL').length;
  }
}
