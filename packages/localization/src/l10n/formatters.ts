import type {
  CoarLocalizationData,
  CoarNumberFormatData,
  CoarCurrencyFormatData,
  CoarPercentFormatData,
  CoarDateFormatData,
} from '../types';

/**
 * Format a number using locale-specific separators.
 */
export function formatNumber(
  value: number,
  data: CoarNumberFormatData,
  decimals?: number,
): string {
  const dec = decimals ?? 2;
  const fixed = Math.abs(value).toFixed(dec);
  const [intPart, fracPart] = fixed.split('.');

  // Apply grouping
  let grouped = '';
  const digits = intPart;
  const groupSize = data.grouping[0] ?? 3;
  let pos = digits.length;
  while (pos > 0) {
    const start = Math.max(0, pos - groupSize);
    grouped = digits.slice(start, pos) + (grouped ? data.group + grouped : '');
    pos = start;
  }

  const sign = value < 0 ? '-' : '';
  if (dec > 0 && fracPart) {
    return `${sign}${grouped}${data.decimal}${fracPart}`;
  }
  return `${sign}${grouped}`;
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
  value: number,
  data: CoarLocalizationData,
  currencyCode?: string,
): string {
  const currency = data.currency;
  const code = currencyCode ?? currency.default;
  const symbol = currency.symbols[code] ?? code;
  const formatted = formatNumber(value, data.number, currency.decimals);

  const space = currency.spacing ? '\u00A0' : '';
  if (currency.position === 'before') {
    return `${symbol}${space}${formatted}`;
  }
  return `${formatted}${space}${symbol}`;
}

/**
 * Format a decimal value as percent (0.25 → "25%").
 */
export function formatPercent(
  value: number,
  data: CoarLocalizationData,
  decimals?: number,
): string {
  const pct = data.percent;
  const dec = decimals ?? pct.decimals;
  const formatted = formatNumber(value * 100, data.number, dec);
  const space = pct.spacing ? '\u00A0' : '';
  return `${formatted}${space}${pct.symbol}`;
}

/**
 * Format a Date using locale date format data.
 * Supports Date objects and ISO date strings.
 */
export function formatDate(
  value: Date | string,
  data: CoarDateFormatData,
  includeTime = false,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  let result: string;
  switch (data.pattern) {
    case 'mm/dd/yyyy':
      result = `${month}/${day}/${year}`;
      break;
    case 'yyyy-mm-dd':
      result = `${year}-${month}-${day}`;
      break;
    case 'dd/mm/yyyy':
      result = `${day}/${month}/${year}`;
      break;
    case 'dd.mm.yyyy':
    default:
      result = `${day}.${month}.${year}`;
      break;
  }

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    result += ` ${hours}:${minutes}`;
  }

  return result;
}
