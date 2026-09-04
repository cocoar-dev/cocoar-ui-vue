/**
 * `resolveTimedCardAnatomy` — compact vs full built-in card (iOS 4.0).
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMED_EVENT_DETAIL_MIN_WIDTH, resolveTimedCardAnatomy } from '../timedCardAnatomy';

const full = (
  durationMinutes: number,
  hasLocation = true,
  visibleWidthPx: number | null = 200,
  overlapped = true,
) =>
  resolveTimedCardAnatomy({
    durationMinutes,
    visibleWidthPx,
    detailMinWidth: DEFAULT_TIMED_EVENT_DETAIL_MIN_WIDTH,
    overlapped,
    hasLocation,
  });

describe('resolveTimedCardAnatomy', () => {
  it('switches to compact below the detail width: one title line, nothing else', () => {
    expect(full(120, true, 111)).toEqual({
      compact: true,
      titleLines: 1,
      showLocation: false,
      showTime: false,
    });
    expect(full(120, true, 112).compact).toBe(false);
  });

  it('never compacts a lone card, before the column is measured, or with the switch disabled', () => {
    // A narrow column ellipsizes a lone card's rows instead of hiding them.
    expect(full(120, true, 60, false)).toMatchObject({ compact: false, showTime: true });
    expect(full(120, true, null).compact).toBe(false);
    expect(
      resolveTimedCardAnatomy({
        durationMinutes: 120,
        visibleWidthPx: 20,
        detailMinWidth: 0,
        overlapped: true,
        hasLocation: true,
      }).compact,
    ).toBe(false);
  });

  it('grows the full anatomy with the card height', () => {
    expect(full(30)).toEqual({
      compact: false,
      titleLines: 1,
      showLocation: false,
      showTime: false,
    });
    expect(full(34)).toMatchObject({ showLocation: true, showTime: false, titleLines: 1 });
    expect(full(52)).toMatchObject({ showLocation: true, showTime: true, titleLines: 1 });
    expect(full(70)).toMatchObject({ showLocation: true, showTime: true, titleLines: 2 });
    // No location → no location row, regardless of height.
    expect(full(120, false).showLocation).toBe(false);
  });
});
