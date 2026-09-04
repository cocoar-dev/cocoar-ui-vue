/**
 * Timed-card anatomy — what the built-in Day / Week card shows, given
 * how much of it is actually unobscured (iOS 4.0 parity).
 *
 * Overlapping cards form a content-aware cascade; a front card may
 * cover most of the card behind it. When an overlapped card's width
 * that stays visible falls below `detailMinWidth` (iOS
 * `timedEventDetailMinimumWidth`, 112 pt), it switches to a
 * **compact** anatomy: one end-truncated title line, no location row,
 * no time row. Every card stays a separate tappable, draggable target.
 * A card alone in its column is never compacted — a narrow column
 * ellipsizes its rows instead. `detailMinWidth` of `0` disables the
 * switch.
 *
 * The full anatomy grows with the card's height, using the same
 * duration thresholds the cascade budgets for its content block:
 * location from 34 minutes, time row from 52, a second title line
 * from 70 (at the default 60 px per hour).
 *
 * Pure: no DOM, no Vue.
 */

export interface TimedCardAnatomy {
  /** Compact policy engaged: one title line, nothing else. */
  compact: boolean;
  /** Title lines the card may use (clamped with an ellipsis). */
  titleLines: 1 | 2;
  showLocation: boolean;
  showTime: boolean;
}

export interface TimedCardAnatomyInput {
  /** Visible duration of the card in minutes. */
  durationMinutes: number;
  /**
   * Width that stays unobscured by cards in front, in pixels. `null`
   * when the column hasn't been measured yet (never compact then).
   */
  visibleWidthPx: number | null;
  /** iOS `timedEventDetailMinimumWidth`; `0` disables the compact switch. */
  detailMinWidth: number;
  /** The card shares its time with others (cascade lanes > 1). */
  overlapped: boolean;
  hasLocation: boolean;
}

export const DEFAULT_TIMED_EVENT_DETAIL_MIN_WIDTH = 112;

export const COMPACT_TIMED_CARD: TimedCardAnatomy = Object.freeze({
  compact: true,
  titleLines: 1,
  showLocation: false,
  showTime: false,
});

export function resolveTimedCardAnatomy(input: TimedCardAnatomyInput): TimedCardAnatomy {
  const { durationMinutes, visibleWidthPx, detailMinWidth, overlapped, hasLocation } = input;
  if (
    overlapped &&
    detailMinWidth > 0 &&
    visibleWidthPx !== null &&
    visibleWidthPx < detailMinWidth
  ) {
    return COMPACT_TIMED_CARD;
  }
  return {
    compact: false,
    titleLines: durationMinutes >= 70 ? 2 : 1,
    showLocation: hasLocation && durationMinutes >= 34,
    showTime: durationMinutes >= 52,
  };
}
