/**
 * Timezone helper utilities for the ZonedDateTimePicker.
 *
 * Provides timezone list generation, grouping, filtering, and offset formatting
 * using browser-native Intl APIs and the Temporal polyfill.
 */
import { Temporal } from '@js-temporal/polyfill';

// ============================================================
// Types
// ============================================================

export interface TimezoneItem {
  /** Full IANA timezone ID (e.g. 'Europe/Vienna') */
  readonly id: string;
  /** City / display name (e.g. 'Vienna') */
  readonly city: string;
  /** Current UTC offset string (e.g. 'UTC+1', 'UTC-5:30') */
  readonly offset: string;
  /** Offset in total minutes for sorting (e.g. 60, -330) */
  readonly offsetMinutes: number;
}

export interface TimezoneGroup {
  /** Continent / region name (e.g. 'Europe', 'America') */
  readonly name: string;
  /** Timezone items within this group */
  readonly items: TimezoneItem[];
}

// ============================================================
// Timezone list
// ============================================================

/** Get all IANA timezone identifiers supported by the browser. */
export function coarGetAllTimezones(): string[] {
  try {
    return ['UTC', ...Intl.supportedValuesOf('timeZone')];
  } catch {
    // Fallback for older environments
    return ['UTC'];
  }
}

// ============================================================
// Offset formatting
// ============================================================

/**
 * Compute the UTC offset of a timezone at the current instant.
 * Returns an object with the offset string and numeric minutes.
 */
export function coarGetTimezoneOffset(
  tzId: string,
  instant?: Temporal.Instant,
): { offset: string; offsetMinutes: number } {
  const now = instant ?? Temporal.Now.instant();
  try {
    const zdt = now.toZonedDateTimeISO(tzId);
    const totalNs = zdt.offsetNanoseconds;
    const totalMinutes = Math.round(totalNs / 60_000_000_000);
    return { offset: formatOffsetMinutes(totalMinutes), offsetMinutes: totalMinutes };
  } catch {
    return { offset: 'UTC', offsetMinutes: 0 };
  }
}

/**
 * Format offset minutes to a compact UTC string.
 * Examples: 0 → 'UTC', 60 → 'UTC+1', -330 → 'UTC-5:30'
 */
function formatOffsetMinutes(totalMinutes: number): string {
  if (totalMinutes === 0) return 'UTC';
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format a timezone ID into a display name.
 * E.g. 'Europe/Vienna' → 'Vienna', 'America/New_York' → 'New York'
 */
export function coarTimezoneDisplayName(tzId: string): string {
  if (tzId === 'UTC') return 'UTC';
  const parts = tzId.split('/');
  const city = parts[parts.length - 1];
  return city.replace(/_/g, ' ');
}

/**
 * Format timezone for display: "Vienna (UTC+1)"
 */
export function coarFormatTimezoneLabel(tzId: string, instant?: Temporal.Instant): string {
  const name = coarTimezoneDisplayName(tzId);
  const { offset } = coarGetTimezoneOffset(tzId, instant);
  return `${name} (${offset})`;
}

// ============================================================
// Timezone filtering
// ============================================================

/**
 * Filter timezone IDs by wildcard patterns.
 * Supports '*' as wildcard (e.g. 'Europe/*', 'America/New_*').
 * Returns all timezones if filters is empty/undefined.
 */
export function coarFilterTimezones(allTimezones: string[], filters?: string[]): string[] {
  if (!filters || filters.length === 0) return allTimezones;
  const regexPatterns = filters.map((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
  });
  return allTimezones.filter((tz) => regexPatterns.some((regex) => regex.test(tz)));
}

// ============================================================
// Timezone grouping
// ============================================================

/**
 * Build a TimezoneItem from an IANA timezone ID.
 */
export function coarBuildTimezoneItem(tzId: string, instant?: Temporal.Instant): TimezoneItem {
  const { offset, offsetMinutes } = coarGetTimezoneOffset(tzId, instant);
  return {
    id: tzId,
    city: coarTimezoneDisplayName(tzId),
    offset,
    offsetMinutes,
  };
}

/**
 * Group timezones by continent/region, sorted alphabetically.
 * Optionally filters by a search query (matches city name or full ID).
 */
export function coarGroupTimezones(
  timezoneIds: string[],
  searchQuery?: string,
  instant?: Temporal.Instant,
): TimezoneGroup[] {
  const query = searchQuery?.trim().toLowerCase();
  const groups = new Map<string, TimezoneItem[]>();

  for (const tzId of timezoneIds) {
    const item = coarBuildTimezoneItem(tzId, instant);

    // Filter by search query
    if (query && query.length > 0) {
      const matchesCity = item.city.toLowerCase().includes(query);
      const matchesId = tzId.toLowerCase().includes(query);
      if (!matchesCity && !matchesId) continue;
    }

    // Group by continent
    const parts = tzId.split('/');
    const groupName = parts.length > 1 ? parts[0] : 'Other';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(item);
  }

  // Sort groups alphabetically, items by city within group
  const result: TimezoneGroup[] = [];
  const sortedKeys = [...groups.keys()].sort();
  for (const name of sortedKeys) {
    const items = groups.get(name)!;
    items.sort((a, b) => a.city.localeCompare(b.city));
    result.push({ name, items });
  }
  return result;
}
