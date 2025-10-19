import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TradeGrid, TradeData, PersonService, Person } from '@trade-platform/trade-grid';
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
  private tradeDataService = inject(TradeDataService);

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

  private updateStats(trades: TradeData[]): void {
    // Only count active trades in stats
    const activeTrades = trades.filter((t) => t.status === 'ACTIVE');
    this.totalTrades = activeTrades.length;
    this.buyCount = activeTrades.filter((t) => t.side === 'BUY').length;
    this.sellCount = activeTrades.filter((t) => t.side === 'SELL').length;
  }
}
