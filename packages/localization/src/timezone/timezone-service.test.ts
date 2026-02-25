import { describe, it, expect } from 'vitest';
import { CoarTimezoneService, BrowserTimezoneProvider } from './timezone-service';
import type { CoarTimezoneProvider } from '../types';

describe('BrowserTimezoneProvider', () => {
  it('returns a timezone string', () => {
    const provider = new BrowserTimezoneProvider();
    const tz = provider.getTimezone();
    expect(tz).toBeTruthy();
    expect(typeof tz).toBe('string');
  });
});

describe('CoarTimezoneService', () => {
  it('resolves to browser timezone by default', () => {
    const service = new CoarTimezoneService();
    expect(service.timezone.value).toBeTruthy();
    expect(typeof service.timezone.value).toBe('string');
  });

  it('prefers custom provider over browser', () => {
    const custom: CoarTimezoneProvider = {
      getTimezone: () => 'Europe/Vienna',
    };
    const service = new CoarTimezoneService([custom]);
    expect(service.timezone.value).toBe('Europe/Vienna');
  });

  it('falls through null providers to browser', () => {
    const nullProvider: CoarTimezoneProvider = {
      getTimezone: () => null,
    };
    const service = new CoarTimezoneService([nullProvider]);
    // Should fall through to browser provider
    expect(service.timezone.value).toBeTruthy();
    expect(service.timezone.value).not.toBe('UTC');
  });

  it('uses first non-null provider', () => {
    const p1: CoarTimezoneProvider = { getTimezone: () => null };
    const p2: CoarTimezoneProvider = { getTimezone: () => 'America/New_York' };
    const p3: CoarTimezoneProvider = { getTimezone: () => 'Europe/London' };
    const service = new CoarTimezoneService([p1, p2, p3]);
    expect(service.timezone.value).toBe('America/New_York');
  });

  it('refreshes timezone', () => {
    let tz: string | null = 'Asia/Tokyo';
    const custom: CoarTimezoneProvider = { getTimezone: () => tz };
    const service = new CoarTimezoneService([custom]);
    expect(service.timezone.value).toBe('Asia/Tokyo');

    tz = 'Europe/Berlin';
    service.refresh();
    expect(service.timezone.value).toBe('Europe/Berlin');
  });
});
