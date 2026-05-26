import { IAggFunc, IAggFuncParams } from 'ag-grid-community';
import { TradeGridValueGetterModel } from '@trade-platform/exac/shared/data';
import { aggregateUniqueValues } from './utils/aggregation-helpers';

export function isUniqueCurrency(params: IAggFuncParams): boolean {
  const dataSet: Set<string> = new Set();
  params.values.forEach((value: TradeGridValueGetterModel) => {
    if (value && value.currency) {
      dataSet.add(value.currency as string);
    }
  });
  return dataSet.size <= 1;
}

export function calcNetAmount(params: IAggFuncParams): any {
  let sumAmount = 0;
  let isNan = false;
  params.values.forEach((value: TradeGridValueGetterModel) => {
    if (value && typeof value.amount === 'number' && !isNaN(value.amount)) {
      if (value.side == 'SEL' || value.side == 'SRT') {
        sumAmount -= value.amount;
      } else {
        sumAmount += value.amount;
      }
    } else {
      isNan = true;
    }
  });
  if (isNan) return '-';
  else return sumAmount;
}

export function calcAvgPrice(params: IAggFuncParams): any {
  let isNan = false;
  let sumOfPriceAndQuantity = 0;
  let sumOfQuantity = 0;
  params.values.forEach((value: TradeGridValueGetterModel) => {
    if (
      value &&
      typeof value.executionQuantity === 'number' &&
      typeof value.amount === 'number' &&
      !isNaN(value.executionQuantity) &&
      !isNaN(value.amount)
    ) {
      sumOfPriceAndQuantity += (value.executionQuantity * value.amount) as number;
      sumOfQuantity += value.executionQuantity as number;
    } else {
      isNan = true;
    }
  });
  if (!isNan && sumOfQuantity > 0) {
    const tradeGridValue = params.values[0] as TradeGridValueGetterModel;
    return {
      amount: (sumOfPriceAndQuantity / sumOfQuantity) as number,
      executionQuantity: tradeGridValue?.executionQuantity as number,
      currency: tradeGridValue?.currency as string,
    };
  } else {
    return { amount: '-' };
  }
}

function aggregateBrokers(params: IAggFuncParams): string {
  const result: string[] = [];
  params.values.forEach((value: string) => {
    if (value && !result.includes(value)) {
      result.push(value);
    }
  });
  result.sort();
  return result.toString().replace(/,/g, ', ');
}

function aggregateTradeSum(params: IAggFuncParams): any {
  let isNan = false;
  if (isUniqueCurrency(params) && params.values.length > 0) {
    let sum = 0;
    params.values.forEach((value: TradeGridValueGetterModel) => {
      if (value && typeof value.amount === 'number' && !isNaN(value.amount)) {
        sum += value.amount as number;
      } else {
        isNan = true;
      }
    });
    if (!isNan) {
      const tradeGridValue = params.values[0] as TradeGridValueGetterModel;
      return { currency: tradeGridValue?.currency as string, amount: sum };
    } else return { amount: '-' };
  } else {
    return { amount: '-' };
  }
}

function aggregateTradeNet(params: IAggFuncParams): any {
  if (isUniqueCurrency(params) && params.values.length > 0) {
    const tradeGridValue = params.values[0] as TradeGridValueGetterModel;
    return {
      currency: tradeGridValue?.currency as string,
      amount: calcNetAmount(params) as string,
    };
  } else {
    return { amount: '-' };
  }
}

function aggregateAvgExecutedPrice(params: IAggFuncParams): any {
  if (isUniqueCurrency(params) && params.values.length > 0) {
    const avgPrice = calcAvgPrice(params) as {
      amount: number | string;
      executionQuantity?: number;
      currency?: string;
    };
    if (typeof avgPrice === 'object' && avgPrice && 'amount' in avgPrice) {
      return {
        amount: avgPrice.amount,
        executionQuantity: avgPrice.executionQuantity,
        currency: avgPrice.currency,
      };
    } else {
      return { amount: '-' };
    }
  } else {
    return { amount: '-' };
  }
}

export function createAggFunctions(): { [key: string]: IAggFunc } {
  return {
    cancelledReason: (params: IAggFuncParams) =>
      aggregateUniqueValues(params.values as string[]),
    cancelledBy: (params: IAggFuncParams) =>
      aggregateUniqueValues(params.values as string[]),
    aggregateUniqueValues: (params: IAggFuncParams) =>
      aggregateUniqueValues(params.values as string[]),
    brokers: aggregateBrokers,
    tradeSum: aggregateTradeSum,
    tradeNet: aggregateTradeNet,
    tradeNetUSD: (params: IAggFuncParams) => {
      return { amount: calcNetAmount(params) as string };
    },
    avgExecutedPrice: aggregateAvgExecutedPrice,
  };
}
