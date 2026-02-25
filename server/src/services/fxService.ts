// ============================================================
// TSG Salary & Cost Calculator - FX Rate Service
// Uses exchangerate-api.com with 24h caching
// Base currency: RON
// ============================================================

interface FXCache {
  rates: Record<string, number>;
  timestamp: number;
  lastUpdate: string;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
let fxCache: FXCache | null = null;

// Fallback rates in case API is unreachable
const FALLBACK_RATES: Record<string, number> = {
  RON: 1,
  EUR: 0.2012,   // ~1 RON = 0.2012 EUR
  CHF: 0.1877,   // ~1 RON = 0.1877 CHF
  USD: 0.2187,
  GBP: 0.1725,
};

export async function fetchFXRates(): Promise<FXCache> {
  // Return cached if still valid
  if (fxCache && Date.now() - fxCache.timestamp < CACHE_DURATION_MS) {
    return fxCache;
  }

  try {
    // Free tier of exchangerate-api.com using RON as base
    const response = await fetch(
      'https://open.er-api.com/v6/latest/RON'
    );
    const data = await response.json() as any;

    if (data && data.rates) {
      fxCache = {
        rates: data.rates,
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
      };
      return fxCache;
    }
    throw new Error('Invalid FX API response');
  } catch (error) {
    console.warn('FX API fetch failed, using fallback rates:', error);
    // Use fallback
    if (fxCache) return fxCache;

    fxCache = {
      rates: FALLBACK_RATES,
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString() + ' (fallback)',
    };
    return fxCache;
  }
}

/**
 * Convert amount from one currency to another via RON base
 * Step 1: valueRON = value * RON_per_input  (but since RON is base, RON_per_input = 1/rate_of_input_in_RON_base)
 * Step 2: valueTarget = valueRON * rate_of_target_in_RON_base
 *
 * Since the API returns rates with RON as base:
 *   rates["EUR"] = how many EUR per 1 RON
 *   To convert X EUR → RON: X / rates["EUR"]
 *   To convert RON → EUR: RON * rates["EUR"]
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  // Step 1: Convert to RON
  const fromRate = rates[fromCurrency];
  if (!fromRate) throw new Error(`Unknown currency: ${fromCurrency}`);
  const valueRON = amount / fromRate;

  // Step 2: Convert RON to target
  const toRate = rates[toCurrency];
  if (!toRate) throw new Error(`Unknown currency: ${toCurrency}`);
  const valueTarget = valueRON * toRate;

  return Math.round(valueTarget * 100) / 100;
}

export function invalidateCache(): void {
  fxCache = null;
}
