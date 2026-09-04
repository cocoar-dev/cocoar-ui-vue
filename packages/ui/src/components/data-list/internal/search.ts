/**
 * Lower-cases and strips diacritics so "Café" matches "cafe" and "CAFÉ" alike.
 */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Splits a query into normalized, non-empty terms. */
export function searchTerms(query: string | undefined | null): string[] {
  if (!query) return [];
  return normalizeSearchText(query).split(/\s+/).filter((term) => term.length > 0);
}

/** Every term must occur somewhere in the (already normalized) haystack. */
export function matchesSearchTerms(normalizedHaystack: string, terms: readonly string[]): boolean {
  for (const term of terms) {
    if (!normalizedHaystack.includes(term)) return false;
  }
  return true;
}

/**
 * Default searchable text of an item: its own string, number and boolean
 * properties joined with spaces. Nested objects and functions are skipped.
 */
export function defaultSearchText(item: unknown): string {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item);
  const parts: string[] = [];
  for (const value of Object.values(item as Record<string, unknown>)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(String(value));
    }
  }
  return parts.join(' ');
}

/** Builds the searchable text for an item from a field list or extractor. */
export function searchTextOf<T>(
  item: T,
  searchBy: ReadonlyArray<keyof T & string> | ((item: T) => string) | undefined,
): string {
  if (typeof searchBy === 'function') return searchBy(item) ?? '';
  if (Array.isArray(searchBy)) {
    const parts: string[] = [];
    for (const field of searchBy) {
      const value = (item as Record<string, unknown>)[field];
      if (value !== null && value !== undefined) parts.push(String(value));
    }
    return parts.join(' ');
  }
  return defaultSearchText(item);
}
