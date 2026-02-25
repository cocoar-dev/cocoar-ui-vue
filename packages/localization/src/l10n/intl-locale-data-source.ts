import type {
  CoarLocalizationData,
  CoarDateFormatData,
  CoarNumberFormatData,
  CoarCurrencyFormatData,
  CoarPercentFormatData,
  CoarLocaleDataSource,
} from '../types';

/**
 * Extracts locale formatting data from the browser's Intl API.
 * Always available as the base/fallback data source.
 */
export class IntlLocaleDataSource implements CoarLocaleDataSource {
  async load(language: string): Promise<CoarLocalizationData> {
    return {
      code: language,
      date: extractDateData(language),
      number: extractNumberData(language),
      currency: extractCurrencyData(language),
      percent: extractPercentData(language),
    };
  }
}

function extractDateData(locale: string): CoarDateFormatData {
  const monthNames: string[] = [];
  const monthNamesShort: string[] = [];
  const dayNames: string[] = [];
  const dayNamesShort: string[] = [];

  // Extract month names
  const monthFull = new Intl.DateTimeFormat(locale, { month: 'long' });
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' });
  for (let m = 0; m < 12; m++) {
    const d = new Date(2024, m, 1);
    monthNames.push(monthFull.format(d));
    monthNamesShort.push(monthShort.format(d));
  }

  // Extract day names (2024-01-07 is a Sunday)
  const dayFull = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const dayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  for (let d = 0; d < 7; d++) {
    const date = new Date(2024, 0, 7 + d); // Jan 7 = Sunday
    dayNames.push(dayFull.format(date));
    dayNamesShort.push(dayShort.format(date));
  }

  // Detect date pattern
  const pattern = detectDatePattern(locale);

  // Detect first day of week
  const firstDayOfWeek = detectFirstDayOfWeek(locale);

  // AM/PM
  const amPm = detectAmPm(locale);

  return {
    pattern,
    firstDayOfWeek,
    monthNames,
    monthNamesShort,
    dayNames,
    dayNamesShort,
    amPm,
  };
}

function detectDatePattern(locale: string): CoarDateFormatData['pattern'] {
  const fmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // Format a known date to detect order
  const parts = fmt.formatToParts(new Date(2024, 11, 25)); // Dec 25, 2024
  const order = parts
    .filter((p) => p.type === 'month' || p.type === 'day' || p.type === 'year')
    .map((p) => p.type);

  const sep = parts.find((p) => p.type === 'literal')?.value ?? '/';

  if (order[0] === 'year') return 'yyyy-mm-dd';
  if (order[0] === 'month') return 'mm/dd/yyyy';
  if (sep === '.') return 'dd.mm.yyyy';
  return 'dd/mm/yyyy';
}

function detectFirstDayOfWeek(locale: string): number {
  // Use Intl.Locale.getWeekInfo() if available (modern browsers)
  try {
    const loc = new Intl.Locale(locale);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weekInfo = (loc as any).getWeekInfo?.() ?? (loc as any).weekInfo;
    if (weekInfo?.firstDay != null) {
      // Intl returns 1=Monday...7=Sunday, we want 0=Sunday...6=Saturday
      return weekInfo.firstDay === 7 ? 0 : weekInfo.firstDay;
    }
  } catch {
    // Fall through to default
  }
  // Default heuristic: most locales use Monday, US/CA/JP use Sunday
  const region = extractRegion(locale);
  const sundayFirstRegions = ['US', 'CA', 'JP', 'KR', 'TW', 'PH', 'IL'];
  return sundayFirstRegions.includes(region) ? 0 : 1;
}

function extractRegion(locale: string): string {
  // First check for explicit region in the locale string
  const parts = locale.split('-');
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  // Use Intl.Locale.maximize() to infer region from language
  // e.g. "de" → "de-Latn-DE", "fr" → "fr-Latn-FR", "ja" → "ja-Jpan-JP"
  try {
    const maximized = new Intl.Locale(locale).maximize();
    return maximized.region?.toUpperCase() ?? '';
  } catch {
    return '';
  }
}

function detectAmPm(locale: string): [string, string] {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true });
    const am = fmt.formatToParts(new Date(2024, 0, 1, 9));
    const pm = fmt.formatToParts(new Date(2024, 0, 1, 15));
    const amStr = am.find((p) => p.type === 'dayPeriod')?.value ?? 'AM';
    const pmStr = pm.find((p) => p.type === 'dayPeriod')?.value ?? 'PM';
    return [amStr, pmStr];
  } catch {
    return ['AM', 'PM'];
  }
}

function extractNumberData(locale: string): CoarNumberFormatData {
  const fmt = new Intl.NumberFormat(locale, { useGrouping: true });
  const parts = fmt.formatToParts(1234567.89);

  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';

  return { decimal, group, grouping: [3] };
}

function extractCurrencyData(locale: string): CoarCurrencyFormatData {
  // Detect default currency from locale
  const region = extractRegion(locale);
  const defaultCurrency = regionToCurrency(region);

  try {
    const fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: defaultCurrency,
    });
    const parts = fmt.formatToParts(1234.56);

    const currencyPart = parts.find((p) => p.type === 'currency');
    const symbol = currencyPart?.value ?? defaultCurrency;

    // Detect position
    const currencyIndex = parts.findIndex((p) => p.type === 'currency');
    const integerIndex = parts.findIndex((p) => p.type === 'integer');
    const position: 'before' | 'after' = currencyIndex < integerIndex ? 'before' : 'after';

    // Detect spacing (literal between currency and number)
    const between = position === 'before'
      ? parts.slice(currencyIndex + 1, integerIndex)
      : parts.slice(integerIndex, currencyIndex);
    const spacing = between.some((p) => p.type === 'literal' && /\s/.test(p.value));

    return {
      default: defaultCurrency,
      symbols: { [defaultCurrency]: symbol },
      position,
      spacing,
      decimals: 2,
    };
  } catch {
    return {
      default: defaultCurrency,
      symbols: {},
      position: 'before',
      spacing: false,
      decimals: 2,
    };
  }
}

function extractPercentData(locale: string): CoarPercentFormatData {
  try {
    const fmt = new Intl.NumberFormat(locale, { style: 'percent' });
    const parts = fmt.formatToParts(0.25);

    const symbol = parts.find((p) => p.type === 'percentSign')?.value ?? '%';
    const percentIndex = parts.findIndex((p) => p.type === 'percentSign');
    const integerIndex = parts.findIndex((p) => p.type === 'integer');

    // Check for spacing between number and percent sign
    const between = percentIndex > integerIndex
      ? parts.slice(integerIndex + 1, percentIndex)
      : parts.slice(percentIndex + 1, integerIndex);
    const spacing = between.some((p) => p.type === 'literal' && /\s/.test(p.value));

    return { symbol, spacing, decimals: 0 };
  } catch {
    return { symbol: '%', spacing: false, decimals: 0 };
  }
}

function regionToCurrency(region: string): string {
  const map: Record<string, string> = {
    US: 'USD', GB: 'GBP', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR',
    ES: 'EUR', NL: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', IE: 'EUR',
    PT: 'EUR', GR: 'EUR', LU: 'EUR', JP: 'JPY', CN: 'CNY', KR: 'KRW',
    CA: 'CAD', AU: 'AUD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
    PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR',
    IN: 'INR', BR: 'BRL', MX: 'MXN', RU: 'RUB', TR: 'TRY', ZA: 'ZAR',
    IL: 'ILS', TW: 'TWD', SG: 'SGD', HK: 'HKD', NZ: 'NZD', PH: 'PHP',
    TH: 'THB', MY: 'MYR', ID: 'IDR', VN: 'VND', AE: 'AED', SA: 'SAR',
  };
  return map[region] ?? 'USD';
}
