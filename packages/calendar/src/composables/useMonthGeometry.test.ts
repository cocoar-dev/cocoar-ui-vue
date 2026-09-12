/**
 * `detailsRowHeight` / `measureMonthMetrics` — the Details row must
 * fit `maxEventsPerCell` pills + "+N" in the HOST's styling, not the
 * stylesheet's. Regression for amZettel 3.2.0-beta.8: a 30 px
 * day-number row and 20 px pills clipped the marker in a 94 px row.
 */

import { describe, expect, it } from 'vitest';
import { detailsRowHeight } from './useMonthGeometry';
import { DEFAULT_MONTH_METRICS, measureMonthMetrics } from './useMonthMetrics';

describe('detailsRowHeight', () => {
  it('is the iOS 94 px with the stylesheet defaults and two pills', () => {
    // 24 + 3 + 2×18 + 2×2 + 18 + 4 = 89 → floored to 94.
    expect(detailsRowHeight(DEFAULT_MONTH_METRICS, 2)).toBe(94);
    expect(detailsRowHeight(DEFAULT_MONTH_METRICS, 0)).toBe(94);
  });

  it('grows for more pills per cell', () => {
    // 24 + 3 + 3×18 + 3×2 + 18 + 4 = 109.
    expect(detailsRowHeight(DEFAULT_MONTH_METRICS, 3)).toBe(109);
  });

  it('grows with a host that restyles the cell (amZettel overrides)', () => {
    const amZettel = {
      dayNumberHeight: 30,
      pillHeight: 20,
      markerHeight: 18,
      pillGap: 3,
      pillsPaddingTop: 4,
      pillsPaddingBottom: 6,
    };
    // 30 + 4 + 2×20 + 2×3 + 18 + 6 = 104.
    expect(detailsRowHeight(amZettel, 2)).toBe(104);
  });

  it('treats a non-finite cap as zero pills', () => {
    expect(detailsRowHeight(DEFAULT_MONTH_METRICS, Number.POSITIVE_INFINITY)).toBe(94);
  });
});

describe('measureMonthMetrics', () => {
  it('returns null without a rendered, laid-out day-number row', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div class="coar-month-cell"><div class="coar-month-cell__day-number-row"></div></div>';
    // happy-dom has no layout: offsetHeight is 0 → nothing measurable.
    expect(measureMonthMetrics(root)).toBeNull();
    expect(measureMonthMetrics(document.createElement('div'))).toBeNull();
  });

  it('reads day row, pill, marker and list spacing from the DOM', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="coar-month-cell">
        <div class="coar-month-cell__day-number-row"></div>
        <div class="coar-month-cell__pills" style="row-gap: 3px; padding-top: 4px; padding-bottom: 6px">
          <div class="coar-month-pill"></div>
          <button class="coar-month-cell__overflow"></button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const dayRow = root.querySelector<HTMLElement>('.coar-month-cell__day-number-row')!;
    const pill = root.querySelector<HTMLElement>('.coar-month-pill')!;
    const marker = root.querySelector<HTMLElement>('.coar-month-cell__overflow')!;
    Object.defineProperty(dayRow, 'offsetHeight', { value: 30 });
    Object.defineProperty(pill, 'offsetHeight', { value: 20 });
    Object.defineProperty(marker, 'offsetHeight', { value: 18 });
    expect(measureMonthMetrics(root)).toEqual({
      dayNumberHeight: 30,
      pillHeight: 20,
      markerHeight: 18,
      pillGap: 3,
      pillsPaddingTop: 4,
      pillsPaddingBottom: 6,
    });
    root.remove();
  });

  it('falls back to the pill height for the marker while no cell overflows', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="coar-month-cell">
        <div class="coar-month-cell__day-number-row"></div>
        <div class="coar-month-cell__pills"><div class="coar-month-pill"></div></div>
      </div>`;
    Object.defineProperty(root.querySelector('.coar-month-cell__day-number-row'), 'offsetHeight', {
      value: 24,
    });
    Object.defineProperty(root.querySelector('.coar-month-pill'), 'offsetHeight', { value: 22 });
    expect(measureMonthMetrics(root)?.markerHeight).toBe(22);
  });
});
