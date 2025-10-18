import { TestBed } from '@angular/core/testing';

import { TradeData } from './trade-data';

describe('TradeData', () => {
  let service: TradeData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TradeData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
