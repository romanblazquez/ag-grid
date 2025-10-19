import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { TradeData as ITradeData } from '@trade-platform/trade-grid';

@Injectable({
  providedIn: 'root',
})
export class TradeDataService {
  private tradesSubject = new BehaviorSubject<ITradeData[]>([]);
  public trades$ = this.tradesSubject.asObservable();

  private symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD'];
  private traders = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];

  constructor() {
    this.initializeData();
    // Disabled automatic updates - uncomment to enable real-time simulation
    // this.simulateRealTimeUpdates();
  }

  private initializeData(): void {
    const initialTrades: ITradeData[] = [];
    const now = new Date();

    // Generate 200 sample trades
    for (let i = 0; i < 200; i++) {
      const trade = this.generateRandomTrade();
      // Vary timestamps over the past 24 hours
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      trade.timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));

      // Randomly set some trades as cancelled (about 20%)
      if (Math.random() < 0.2) {
        trade.status = 'CANCELLED';
        // Assign random canceller for demo purposes
        const cancellerIds = ['user1', 'user2', 'admin1', 'supervisor1', 'supervisor2'];
        trade.cancelledBy = cancellerIds[Math.floor(Math.random() * cancellerIds.length)];
      }

      initialTrades.push(trade);
    }

    // Sort by timestamp descending (newest first)
    initialTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.tradesSubject.next(initialTrades);
  }

  private generateId(): string {
    return `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private simulateRealTimeUpdates(): void {
    // Simulate new trades every 5 seconds
    interval(5000).subscribe(() => {
      const currentTrades = this.tradesSubject.value;
      const newTrade = this.generateRandomTrade();
      this.tradesSubject.next([newTrade, ...currentTrades]);
    });
  }

  private generateRandomTrade(): ITradeData {
    const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
    const basePrice = this.getBasePrice(symbol);
    const price = basePrice + (Math.random() - 0.5) * 10;

    return {
      id: this.generateId(),
      symbol,
      price: Number(price.toFixed(2)),
      quantity: Math.floor(Math.random() * 500) + 50,
      side: Math.random() > 0.5 ? 'BUY' : 'SELL',
      timestamp: new Date(),
      trader: this.traders[Math.floor(Math.random() * this.traders.length)],
      status: 'ACTIVE',
    };
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      AAPL: 175,
      GOOGL: 142,
      MSFT: 380,
      TSLA: 245,
      AMZN: 178,
      META: 485,
      NVDA: 875,
      AMD: 165,
    };
    return prices[symbol] || 100;
  }

  getTrades(): Observable<ITradeData[]> {
    return this.trades$;
  }

  getTradeCount(): Observable<number> {
    return this.trades$.pipe(map((trades) => trades.length));
  }

  cancelTrade(tradeId: string, cancelledBy = 'user1'): void {
    const currentTrades = this.tradesSubject.value;
    const updatedTrades = currentTrades.map((trade) =>
      trade.id === tradeId && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const, cancelledBy }
        : trade
    );
    this.tradesSubject.next(updatedTrades);
  }

  cancelMultipleTrades(tradeIds: string[], cancelledBy = 'user1'): void {
    const currentTrades = this.tradesSubject.value;
    const tradeIdSet = new Set(tradeIds);
    const updatedTrades = currentTrades.map((trade) =>
      tradeIdSet.has(trade.id) && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const, cancelledBy }
        : trade
    );
    this.tradesSubject.next(updatedTrades);
  }
}
