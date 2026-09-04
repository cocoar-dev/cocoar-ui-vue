/// <reference types="vite/client" />
/**
 * `--coar-color-accent` is the calendar's today/accent colour. The
 * package never DEFINES it (a `:root` definition would fight the
 * host's own theme in load-order-dependent ways); instead every
 * usage falls back to the vue-ui accent ramp and only then to the
 * historical blue:
 *
 *   var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))
 *
 * So a host that sets `--coar-accent` (the single vue-ui brand
 * token) gets matching calendar markers for free, and a host that
 * sets `--coar-color-accent` explicitly still wins. This test fails
 * on a bare `var(--coar-color-accent, #…)` sneaking back in.
 */

import { describe, expect, it } from 'vitest';

const sources = import.meta.glob<string>('../**/*.{vue,css,ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('--coar-color-accent fallback chain', () => {
  it('every usage falls back to the vue-ui accent ramp before the hard-coded blue', () => {
    const offenders: string[] = [];
    let usages = 0;
    for (const [path, text] of Object.entries(sources)) {
      if (/__tests__|\.test\.ts$/.test(path)) continue;
      for (const match of text.matchAll(/var\(--coar-color-accent,\s*([^)]*)\)/g)) {
        usages += 1;
        if (!match[1].startsWith('var(--coar-color-accent-500')) {
          offenders.push(`${path}: ${match[0]}`);
        }
      }
    }
    expect(usages).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
