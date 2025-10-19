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
    const initialTrades: ITradeData[] = [
      {
        id: this.generateId(),
        symbol: 'AAPL',
        price: 175.5,
        quantity: 100,
        side: 'BUY',
        timestamp: new Date(),
        trader: 'John Doe',
        status: 'ACTIVE',
      },
      {
        id: this.generateId(),
        symbol: 'GOOGL',
        price: 142.3,
        quantity: 50,
        side: 'SELL',
        timestamp: new Date(),
        trader: 'Jane Smith',
        status: 'ACTIVE',
      },
      {
        id: this.generateId(),
        symbol: 'MSFT',
        price: 380.25,
        quantity: 75,
        side: 'BUY',
        timestamp: new Date(),
        trader: 'Bob Johnson',
        status: 'ACTIVE',
      },
      {
        id: this.generateId(),
        symbol: 'TSLA',
        price: 245.8,
        quantity: 200,
        side: 'BUY',
        timestamp: new Date(),
        trader: 'Alice Williams',
        status: 'ACTIVE',
      },
      {
        id: this.generateId(),
        symbol: 'AMZN',
        price: 178.9,
        quantity: 150,
        side: 'SELL',
        timestamp: new Date(),
        trader: 'Charlie Brown',
        status: 'ACTIVE',
      },
    ];

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

  cancelTrade(tradeId: string): void {
    const currentTrades = this.tradesSubject.value;
    const updatedTrades = currentTrades.map((trade) =>
      trade.id === tradeId && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const }
        : trade
    );
    this.tradesSubject.next(updatedTrades);
  }

  cancelMultipleTrades(tradeIds: string[]): void {
    const currentTrades = this.tradesSubject.value;
    const tradeIdSet = new Set(tradeIds);
    const updatedTrades = currentTrades.map((trade) =>
      tradeIdSet.has(trade.id) && trade.status === 'ACTIVE'
        ? { ...trade, status: 'CANCELLED' as const }
        : trade
    );
    this.tradesSubject.next(updatedTrades);
  }
}
