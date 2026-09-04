/// <reference types="vite/client" />
/**
 * Drift guard for the shipped translation catalogs.
 *
 * Scans every non-test `.ts` / `.vue` under `src/` for
 * `'coar.calendar.<key>'` literals and asserts each one exists in
 * BOTH catalogs. Adding a label to a view without adding its two
 * translations fails here — not in a consumer's German UI.
 */

import { describe, expect, it } from 'vitest';
import { calendarMessages, createCalendarTranslationSource } from './messages';

// Vite's glob import hands us every source file as raw text — no
// node:fs, no __dirname, works under the package's browser-only
// tsconfig.
const sources = import.meta.glob<string>('../**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function usedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const [path, text] of Object.entries(sources)) {
    if (/\.test\.ts$/.test(path) || /__tests__|__test-utils__/.test(path)) continue;
    if (path.endsWith('/i18n/messages.ts')) continue;
    for (const match of text.matchAll(/'(coar\.calendar\.[A-Za-z0-9_.]+)'/g)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

describe('calendarMessages', () => {
  const used = usedKeys();

  it('finds keys in the source tree (sanity check for the scanner)', () => {
    expect(used.size).toBeGreaterThan(30);
    expect(used.has('coar.calendar.nav.today')).toBe(true);
  });

  it('covers every key the components read — English', () => {
    const missing = [...used].filter((k) => !(k in calendarMessages.en));
    expect(missing).toEqual([]);
  });

  it('covers every key the components read — German', () => {
    const missing = [...used].filter((k) => !(k in calendarMessages.de));
    expect(missing).toEqual([]);
  });

  it('has no orphan keys that nothing reads any more', () => {
    const orphans = Object.keys(calendarMessages.en).filter((k) => !used.has(k));
    expect(orphans).toEqual([]);
  });

  it('keeps the same placeholder set per key across languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(calendarMessages.en)) {
      expect(placeholders(calendarMessages.de[key]), key).toEqual(
        placeholders(calendarMessages.en[key]),
      );
    }
  });
});

describe('createCalendarTranslationSource', () => {
  it('serves the base catalog for regional tags', async () => {
    const source = createCalendarTranslationSource();
    const deAt = await source.load('de-AT');
    expect(deAt?.['coar.calendar.nav.today']).toBe('Heute');
    const enGb = await source.load('en-GB');
    expect(enGb?.['coar.calendar.nav.today']).toBe('Today');
  });

  it('yields null for languages it does not ship', async () => {
    const source = createCalendarTranslationSource();
    expect(await source.load('fr')).toBeNull();
  });

  it('hands out a copy, never the shared catalog object', async () => {
    const source = createCalendarTranslationSource();
    const a = await source.load('en');
    expect(a).not.toBe(calendarMessages.en);
  });
});
