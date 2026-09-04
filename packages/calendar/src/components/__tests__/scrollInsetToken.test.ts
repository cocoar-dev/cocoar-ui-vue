/// <reference types="vite/client" />
/**
 * `--coar-calendar-scroll-inset-bottom` — bottom content inset.
 *
 * Every scrolling surface must read the token, so a host that sets
 * it once gets the same room under its bottom chrome in every view.
 * Layout can't be measured under happy-dom, so this pins the contract
 * at the source level: each surface's styles reference the token,
 * and the scroll containers honour it for focus-driven scrolling.
 *
 * Adding a scrolling surface? Add it here and read the token.
 */

import { describe, expect, it } from 'vitest';

const sources = import.meta.glob<string>('../*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const TOKEN = '--coar-calendar-scroll-inset-bottom';

/** surface file → what it must do with the token. */
const SURFACES: Record<string, { contentRoom: RegExp; scrollPadding: boolean }> = {
  // Content inside an outer scroller (the shell body or the host's own).
  'CoarTimeGrid.vue': {
    contentRoom:
      /\.coar-time-grid \{[^}]*padding-bottom: var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: false,
  },
  // Owns its scroller.
  'CoarContinuousMonthView.vue': {
    contentRoom:
      /\.coar-continuous-month-view::after \{[^}]*height: var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: true,
  },
  'CoarMonthListView.vue': {
    contentRoom:
      /\.coar-month-list-view__agenda::after \{[^}]*height: var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: true,
  },
  'CoarTimelineView.vue': {
    contentRoom:
      /\.coar-timeline-view::after \{[^}]*height: var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: true,
  },
  'CoarYearView.vue': {
    contentRoom:
      /\.coar-year-view \{[^}]*padding-bottom: calc\(20px \+ var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: true,
  },
  // Agenda's virtualized scroller: the spacer is the content.
  'VirtualizedSurface1DY.vue': {
    contentRoom: /__spacer \{[^}]*padding-bottom: var\(--coar-calendar-scroll-inset-bottom/s,
    scrollPadding: true,
  },
  // The shell body scrolls the time grids.
  'CoarCalendar.vue': {
    contentRoom: /scroll-padding-bottom: var\(--coar-calendar-scroll-inset-bottom/,
    scrollPadding: true,
  },
};

function source(file: string): string {
  const key = Object.keys(sources).find((k) => k.endsWith('/' + file));
  if (!key) throw new Error(`missing source ${file}`);
  return sources[key];
}

describe('--coar-calendar-scroll-inset-bottom', () => {
  for (const [file, rule] of Object.entries(SURFACES)) {
    it(`${file} gives the content room at the bottom`, () => {
      const src = source(file);
      expect(src, `${file} does not read ${TOKEN}`).toContain(TOKEN);
      expect(src).toMatch(rule.contentRoom);
      if (rule.scrollPadding) {
        expect(src).toMatch(
          /scroll-padding-bottom: var\(--coar-calendar-scroll-inset-bottom, 0px\)/,
        );
      }
    });
  }

  it('the token always falls back to 0px', () => {
    for (const file of Object.keys(SURFACES)) {
      const bare = source(file).match(/var\(--coar-calendar-scroll-inset-bottom\)/g);
      expect(bare, `${file} reads the token without a 0px fallback`).toBeNull();
    }
  });
});
