/** Locale-aware comparator for mixed primitive values. */
export type ValueComparator = (a: unknown, b: unknown) => number;

function createCollator(locale?: string): Intl.Collator {
  const options: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' };
  try {
    return new Intl.Collator(locale || undefined, options);
  } catch {
    // Invalid or unsupported locale tag — fall back to the runtime default.
    return new Intl.Collator(undefined, options);
  }
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined;
}

function toComparableString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  // Temporal types and other value objects stringify to sortable ISO-like text.
  return String(value);
}

/**
 * Creates a comparator that sorts ascending and treats values the way people expect:
 * numbers numerically, dates chronologically, booleans false-first, everything else
 * as text through `Intl.Collator` (numeric strings and diacritics handled). `null` and
 * `undefined` always sort last regardless of direction handling by the caller.
 */
export function createValueComparator(locale?: string): ValueComparator {
  const collator = createCollator(locale);
  return (a, b) => {
    if (a === b) return 0;
    const aEmpty = isEmpty(a);
    const bEmpty = isEmpty(b);
    if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1;

    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) ? (Number.isNaN(b) ? 0 : 1) : -1;
      return a - b;
    }
    if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

    return collator.compare(toComparableString(a), toComparableString(b));
  };
}

/** Sort `items` by a value extractor with a stable order for equal values. */
export function sortByValue<T>(
  items: readonly T[],
  by: (item: T) => unknown,
  compare: ValueComparator,
  descending = false,
): T[] {
  const decorated = items.map((item, index) => ({ item, index, value: by(item) }));
  decorated.sort((left, right) => {
    const result = compare(left.value, right.value);
    if (result !== 0) return descending ? -result : result;
    return left.index - right.index;
  });
  return decorated.map((entry) => entry.item);
}

/** Sort `items` with a full comparator, keeping the input order for ties. */
export function sortWithComparator<T>(
  items: readonly T[],
  compare: (a: T, b: T) => number,
  descending = false,
): T[] {
  const decorated = items.map((item, index) => ({ item, index }));
  decorated.sort((left, right) => {
    const result = compare(left.item, right.item);
    if (result !== 0) return descending ? -result : result;
    return left.index - right.index;
  });
  return decorated.map((entry) => entry.item);
}
