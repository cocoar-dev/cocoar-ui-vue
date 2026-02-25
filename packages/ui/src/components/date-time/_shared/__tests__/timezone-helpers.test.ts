import { describe, it, expect } from 'vitest';

import { Temporal } from '@js-temporal/polyfill';

import {
  coarGetAllTimezones,
  coarGetTimezoneOffset,
  coarTimezoneDisplayName,
  coarFormatTimezoneLabel,
  coarFilterTimezones,
  coarBuildTimezoneItem,
  coarGroupTimezones,
} from '../timezone-helpers';

describe('timezone-helpers', () => {
  describe('coarGetAllTimezones', () => {
    it('returns an array containing UTC', () => {
      const tzs = coarGetAllTimezones();
      expect(tzs).toContain('UTC');
    });

    it('returns well-known timezones', () => {
      const tzs = coarGetAllTimezones();
      expect(tzs).toContain('Europe/Vienna');
      expect(tzs).toContain('America/New_York');
      expect(tzs).toContain('Asia/Tokyo');
    });

    it('returns many timezones', () => {
      const tzs = coarGetAllTimezones();
      expect(tzs.length).toBeGreaterThan(100);
    });
  });

  describe('coarGetTimezoneOffset', () => {
    it('returns UTC offset 0 for UTC', () => {
      const result = coarGetTimezoneOffset('UTC');
      expect(result.offset).toBe('UTC');
      expect(result.offsetMinutes).toBe(0);
    });

    it('returns a non-zero offset for a non-UTC timezone', () => {
      const result = coarGetTimezoneOffset('Asia/Kolkata');
      expect(result.offset).toBe('UTC+5:30');
      expect(result.offsetMinutes).toBe(330);
    });

    it('handles negative offsets', () => {
      // Use a fixed instant to avoid DST ambiguity
      const instant = Temporal.Instant.from('2025-01-15T12:00:00Z'); // Winter: EST = UTC-5
      const result = coarGetTimezoneOffset('America/New_York', instant);
      expect(result.offset).toBe('UTC-5');
      expect(result.offsetMinutes).toBe(-300);
    });
  });

  describe('coarTimezoneDisplayName', () => {
    it('returns UTC for UTC', () => {
      expect(coarTimezoneDisplayName('UTC')).toBe('UTC');
    });

    it('extracts city name', () => {
      expect(coarTimezoneDisplayName('Europe/Vienna')).toBe('Vienna');
    });

    it('replaces underscores with spaces', () => {
      expect(coarTimezoneDisplayName('America/New_York')).toBe('New York');
    });

    it('handles multi-level paths', () => {
      expect(coarTimezoneDisplayName('America/Indiana/Indianapolis')).toBe('Indianapolis');
    });
  });

  describe('coarFormatTimezoneLabel', () => {
    it('formats timezone with offset', () => {
      const label = coarFormatTimezoneLabel('Asia/Kolkata');
      expect(label).toBe('Kolkata (UTC+5:30)');
    });

    it('formats UTC', () => {
      const label = coarFormatTimezoneLabel('UTC');
      expect(label).toBe('UTC (UTC)');
    });
  });

  describe('coarFilterTimezones', () => {
    const allTzs = ['UTC', 'Europe/Vienna', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];

    it('returns all when no filter', () => {
      expect(coarFilterTimezones(allTzs)).toEqual(allTzs);
      expect(coarFilterTimezones(allTzs, [])).toEqual(allTzs);
    });

    it('filters by continent wildcard', () => {
      const result = coarFilterTimezones(allTzs, ['Europe/*']);
      expect(result).toEqual(['Europe/Vienna', 'Europe/Berlin']);
    });

    it('supports multiple patterns', () => {
      const result = coarFilterTimezones(allTzs, ['Europe/*', 'UTC']);
      expect(result).toEqual(['UTC', 'Europe/Vienna', 'Europe/Berlin']);
    });

    it('is case insensitive', () => {
      const result = coarFilterTimezones(allTzs, ['europe/*']);
      expect(result).toEqual(['Europe/Vienna', 'Europe/Berlin']);
    });
  });

  describe('coarBuildTimezoneItem', () => {
    it('builds a complete timezone item', () => {
      const item = coarBuildTimezoneItem('Europe/Vienna');
      expect(item.id).toBe('Europe/Vienna');
      expect(item.city).toBe('Vienna');
      expect(item.offset).toMatch(/^UTC[+-]?\d*/);
      expect(typeof item.offsetMinutes).toBe('number');
    });
  });

  describe('coarGroupTimezones', () => {
    const tzIds = ['UTC', 'Europe/Vienna', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];

    it('groups by continent', () => {
      const groups = coarGroupTimezones(tzIds);
      const names = groups.map((g) => g.name);
      expect(names).toContain('Europe');
      expect(names).toContain('America');
      expect(names).toContain('Asia');
    });

    it('sorts groups alphabetically', () => {
      const groups = coarGroupTimezones(tzIds);
      const names = groups.map((g) => g.name);
      expect(names).toEqual([...names].sort());
    });

    it('filters by search query', () => {
      const groups = coarGroupTimezones(tzIds, 'vienna');
      expect(groups.length).toBe(1);
      expect(groups[0].name).toBe('Europe');
      expect(groups[0].items.length).toBe(1);
      expect(groups[0].items[0].city).toBe('Vienna');
    });

    it('returns empty for no matches', () => {
      const groups = coarGroupTimezones(tzIds, 'xxxxxx');
      expect(groups.length).toBe(0);
    });
  });
});
