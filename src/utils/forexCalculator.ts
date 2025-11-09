// Forex pip value calculator for different currencies
export interface PipCalculationResult {
  stopLossValue: number;
  takeProfitValue: number;
  pipValue: number;
}

interface ForexPair {
  base: string;
  quote: string;
  pipLocation: number; // 4 for most pairs, 2 for JPY pairs
}

// Common forex pairs and their pip locations
const FOREX_PAIRS: Record<string, ForexPair> = {
  'EURUSD': { base: 'EUR', quote: 'USD', pipLocation: 4 },
  'GBPUSD': { base: 'GBP', quote: 'USD', pipLocation: 4 },
  'AUDUSD': { base: 'AUD', quote: 'USD', pipLocation: 4 },
  'NZDUSD': { base: 'NZD', quote: 'USD', pipLocation: 4 },
  'USDCAD': { base: 'USD', quote: 'CAD', pipLocation: 4 },
  'USDCHF': { base: 'USD', quote: 'CHF', pipLocation: 4 },
  'USDJPY': { base: 'USD', quote: 'JPY', pipLocation: 2 },
  'EURJPY': { base: 'EUR', quote: 'JPY', pipLocation: 2 },
  'GBPJPY': { base: 'GBP', quote: 'JPY', pipLocation: 2 },
  'AUDJPY': { base: 'AUD', quote: 'JPY', pipLocation: 2 },
  'EURGBP': { base: 'EUR', quote: 'GBP', pipLocation: 4 },
  'EURAUD': { base: 'EUR', quote: 'AUD', pipLocation: 4 },
  'GBPAUD': { base: 'GBP', quote: 'AUD', pipLocation: 4 },
};

// Exchange rates (in practice, these would come from a real-time API)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 0.85,
  'GBP': 0.73,
  'AUD': 1.52,
  'NZD': 1.64,
  'CAD': 1.35,
  'CHF': 0.88,
  'JPY': 150.0,
};

export function calculateForexPipValue(
  symbol: string,
  entryPrice: number,
  stopLoss: number | null,
  takeProfit: number | null,
  positionSize: number,
  accountCurrency: string
): PipCalculationResult {
  // For non-forex symbols or INR accounts, return simple calculations
  if (accountCurrency === 'INR' || !FOREX_PAIRS[symbol.toUpperCase()]) {
    const stopLossValue = stopLoss ? Math.abs(entryPrice - stopLoss) * positionSize : 0;
    const takeProfitValue = takeProfit ? Math.abs(takeProfit - entryPrice) * positionSize : 0;
    
    return {
      stopLossValue,
      takeProfitValue,
      pipValue: 0
    };
  }

  const pair = FOREX_PAIRS[symbol.toUpperCase()];
  if (!pair) {
    return {
      stopLossValue: 0,
      takeProfitValue: 0,
      pipValue: 0
    };
  }

  // Calculate pip value
  const pipSize = Math.pow(10, -pair.pipLocation);
  let pipValue = pipSize * positionSize;

  // Convert pip value to account currency
  if (pair.quote === accountCurrency) {
    // Quote currency matches account currency
    pipValue = pipValue;
  } else if (pair.base === accountCurrency) {
    // Base currency matches account currency
    pipValue = pipValue / entryPrice;
  } else {
    // Need to convert through USD or direct rate
    const quoteToAccount = EXCHANGE_RATES[accountCurrency] / EXCHANGE_RATES[pair.quote];
    pipValue = pipValue * quoteToAccount;
  }

  // Calculate stop loss and take profit values
  const stopLossValue = stopLoss ? 
    Math.abs(entryPrice - stopLoss) / pipSize * pipValue : 0;
  
  const takeProfitValue = takeProfit ? 
    Math.abs(takeProfit - entryPrice) / pipSize * pipValue : 0;

  return {
    stopLossValue,
    takeProfitValue,
    pipValue
  };
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'AUD': 'A$',
    'NZD': 'NZ$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'INR': '₹'
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}