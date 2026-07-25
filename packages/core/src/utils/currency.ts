// ============================================================================
// @preone/core — Currency Utilities
// ============================================================================

/** ISO 4217 currency codes (common subset). */
export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CNY'
  | 'KRW'
  | 'INR'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'HKD'
  | 'SGD'
  | 'TWD'
  | 'BRL'
  | 'MXN'
  | 'NZD'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'ZAR'
  | 'RUB'
  | 'TRY'
  | 'THB'
  | 'MYR'
  | 'PHP'
  | 'IDR'
  | 'VND'
  | 'AED'
  | 'SAR'
  | 'PLN';

/** Map of currency codes to their symbols. */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  HKD: 'HK$',
  SGD: 'S$',
  TWD: 'NT$',
  BRL: 'R$',
  MXN: 'MX$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  ZAR: 'R',
  RUB: '₽',
  TRY: '₺',
  THB: '฿',
  MYR: 'RM',
  PHP: '₱',
  IDR: 'Rp',
  VND: '₫',
  AED: 'AED',
  SAR: 'SAR',
  PLN: 'zł',
};

/**
 * Format a number as currency with the currency code.
 * e.g. formatCurrencyWithCode(1234.56, 'USD') → "$1,234.56 USD"
 */
export function formatCurrencyWithCode(
  value: number,
  code: CurrencyCode,
  locale: string = 'en-US',
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
  }).format(value);
  return `${formatted} ${code}`;
}

/**
 * Parse a currency string into a number.
 * Strips currency symbols and formatting characters.
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? NaN : num;
}

/**
 * Currency conversion interface.
 * This does NOT call any external API — it uses a user-provided rate map.
 * To implement actual conversion, provide rates via the `rates` parameter.
 */
export interface CurrencyConverter {
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number;
  getRate(from: CurrencyCode, to: CurrencyCode): number | undefined;
}

/**
 * Create a currency converter with a provided rate map.
 * Rates are expressed as: 1 unit of `from` = rate units of `to`.
 *
 * @example
 * const converter = convertCurrency({
 *   'USD->EUR': 0.92,
 *   'EUR->USD': 1.09,
 * });
 * converter.convert(100, 'USD', 'EUR'); // 92
 */
export function convertCurrency(
  rates: Record<string, number>,
): CurrencyConverter {
  return {
    getRate(from: CurrencyCode, to: CurrencyCode): number | undefined {
      if (from === to) return 1;
      return rates[`${from}->${to}`];
    },
    convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
      if (from === to) return amount;
      const rate = rates[`${from}->${to}`];
      if (rate === undefined) {
        throw new Error(`No conversion rate available for ${from} -> ${to}`);
      }
      return amount * rate;
    },
  };
}
