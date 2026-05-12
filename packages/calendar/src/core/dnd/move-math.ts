/**
 * Pure-function move/resize math shared by every DnD mode.
 *
 * Computes the proposed `next` payload (start/end) given the
 * dragged event, the snapped drop target, and the drag mode.
 *
 *   - Move modes preserve duration / span and shift the whole
 *     event to the target slot.
 *   - Resize modes only update one side (start XOR end). The
 *     other side is preserved from the original event, with a
 *     small minimum-duration clamp so the user can't flip the
 *     event past zero.
 *
 * **Article-4 anchoring.** Drop targets carry a `displayZone` (the
 * IANA zone the calendar is currently rendering in). Targets are
 * resolved INTO the display zone (because that's where the user's
 * eyes saw the slot), then re-zoned to the EVENT's source zone so
 * the event keeps its original `timeZoneId`. A meeting created in
 * Tokyo, viewed in Vienna and dropped on the 14:00 row, becomes
 * 14:00 Vienna ↔ 22:00 Tokyo (intent preserved).
 *
 * Used in two places:
 *
 *   1. The drop handler in `useCalendarDnd` (final payload sent
 *      to the consumer via `event-drop`).
 *   2. The live preview ghost in `<CoarTimeGrid>` /
 *      `<CoarMonthView>` (the consumer's `workingEvents`
 *      computed swaps in a synthetic preview event built from
 *      this output, so the ghost geometry is bit-identical to
 *      what the eventual drop payload will encode).
 *
 * Pure function — no imports from Vue, no side effects.
 */

import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../types';
import { isAllDayEvent, isTimedEvent } from '../types';

/** Minimum duration of a resized timed event, in minutes. */
export const MIN_RESIZE_MINUTES = 15;

/**
 * One-of for every drag-mode the calendar surfaces. Imported by
 * the move-math entry point so consumers don't need to depend on
 * the `useCalendarDnd` composable to call this function.
 */
export type CalendarDragMode =
  | 'timed'
  | 'timed-resize-start'
  | 'timed-resize-end'
  | 'allDay'
  | 'allDay-resize-start'
  | 'allDay-resize-end'
  | 'month'
  | 'month-resize-start'
  | 'month-resize-end';

/**
 * DST disambiguation outcome — set by `applyMoveToEvent` whenever
 * the resolved target date+time hits a spring-forward gap or a
 * fall-back overlap in the event's source zone.
 *
 *   - `null`      — clean conversion, no DST event happened.
 *   - `'gap'`     — date+time doesn't exist (e.g. 02:30 on 2026-03-29
 *                    Vienna). Result has been resolved per the active
 *                    `DstPolicy`; consumers can show a "we shifted
 *                    your meeting" toast.
 *   - `'overlap'` — date+time exists twice (e.g. 02:30 on 2026-10-25
 *                    Vienna). Result picked one per `DstPolicy`.
 *
 * **Note (Article 3 — fairness contract):** the flag reflects the DST
 * situation in the DISPLAY zone — i.e. what the user actually saw and
 * clicked. For a cross-zone event (Tokyo source rendered in Vienna),
 * a drop on the Vienna spring-forward gap reports `'gap'` because
 * that's the user's experience; the resulting `next.start` lives in
 * the source zone (Tokyo) where there is no gap. This is intentional:
 * the consumer's UI ("we shifted your meeting") is anchored to the
 * user's perception, not to the storage zone.
 */
export type DstDisambiguation = null | 'gap' | 'overlap';

/** Snapped drop target produced by hit-tests. */
export interface CalendarDropTarget {
  /** ISO date string `'YYYY-MM-DD'` of the drop day. */
  date: string;
  /**
   * Minute-of-day in the DISPLAY zone (`displayZone`), or `null`
   * when the target is in an all-day band / month cell with no
   * time component.
   */
  minutes: number | null;
  /**
   * IANA timezone the calendar renders in — the one `target.minutes`
   * is anchored to. Required for timed targets so move-math can
   * resolve the slot in the right zone (Article-4 fix for the bug
   * where targets were resolved as UTC).
   */
  displayZone: string;
  /** Whether `canDrop()` (if any) accepted this target. */
  valid: boolean;
}

/**
 * Re-exported `DstPolicy` — single source of truth lives in
 * `../temporal.ts`. Code MUST import from one of the public paths
 * and never re-declare it (drift hazard).
 */
export type { DstPolicy } from '../temporal';
import type { DstPolicy } from '../temporal';

/**
 * Thrown by `applyMoveToEvent` when `dstPolicy === 'reject'` and the
 * target falls in a DST gap or overlap. The drop layer translates
 * this into `valid=false` so the snap-back animation fires.
 */
export class DstResolutionError extends Error {
  readonly disambiguation: 'gap' | 'overlap';
  constructor(disambiguation: 'gap' | 'overlap', message: string) {
    super(message);
    this.name = 'DstResolutionError';
    this.disambiguation = disambiguation;
  }
}

/**
 * Result shape of `applyMoveToEvent`. The shape mirrors the input
 * event: `ZonedDateTime` for timed events, `PlainDate` for all-day.
 *
 * `disambiguation` is set whenever the resolved start landed on a DST
 * gap or overlap in the event's source zone (or, for resize modes,
 * the moved end). `null` for clean conversions, all-day moves, or
 * when the policy was `'reject'` (in which case the function throws
 * before returning).
 */
export type MoveResult =
  | {
      start: Temporal.ZonedDateTime;
      end?: Temporal.ZonedDateTime;
      disambiguation?: DstDisambiguation;
    }
  | {
      start: Temporal.PlainDate;
      end?: Temporal.PlainDate;
      disambiguation?: DstDisambiguation;
    };

/**
 * Detect whether a `{ year, month, day, hour, minute }` combination
 * lands in a DST gap (`'gap'`), DST overlap (`'overlap'`), or is
 * unambiguous (`null`) in a given IANA zone.
 *
 * Strategy: try `toZonedDateTime` with `disambiguation: 'reject'`
 * — that throws iff the wall-time doesn't exist (gap). For overlap,
 * compare the offset of the `'earlier'` and `'later'` resolutions:
 * different offsets ⇒ overlap.
 *
 * **Exported.** Reused by the recurrence engine's Phase-4 DST
 * post-processing layer (`src/recurrence/internal/dst-resolve.ts`)
 * so the drag pipeline and the recurrence pipeline produce identical
 * DST semantics from a single source.
 */
export function detectDstSituation(
  zone: string,
  parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
  },
): 'gap' | 'overlap' | null {
  let pdt: Temporal.PlainDateTime;
  try {
    pdt = Temporal.PlainDateTime.from({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second ?? 0,
    });
  } catch {
    return null;
  }
  // Strategy:
  // 1. Try 'reject' — succeeds only for clean wall-times.
  // 2. On reject-throw: ask for 'earlier'. If the resulting wall-time
  //    matches the input PDT, it's an OVERLAP (input exists, just
  //    ambiguous). If it differs, it's a GAP (input doesn't exist;
  //    earlier shifted backward to a real wall-time).
  try {
    pdt.toZonedDateTime(zone, { disambiguation: 'reject' });
    return null;
  } catch {
    // proceed
  }
  let earlier: Temporal.ZonedDateTime;
  try {
    earlier = pdt.toZonedDateTime(zone, { disambiguation: 'earlier' });
  } catch {
    return null;
  }
  const earlierPdt = earlier.toPlainDateTime();
  if (Temporal.PlainDateTime.compare(earlierPdt, pdt) === 0) {
    return 'overlap';
  }
  return 'gap';
}

// ─── EventDropPayload (the C2 single-pipeline output shape) ──────

/**
 * Shape of the payload fired by `onEventDrop`. Same layout for every
 * drag mode (mouse / keyboard / touch) and every drop site (time-grid
 * / month / agenda) — produced by `buildDropPayload` exactly once per
 * commit.
 */
export interface EventDropPayload<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  event: CalendarEvent<TMeta>;
  /** Snapshot at drag-start. `displayZone` is the zone the user
   *  STARTED viewing in (a mid-drag `.timezone()` swap is allowed). */
  original: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  };
  /** Resolved next event state — per-endpoint source zones preserved
   *  (C3). */
  next: MoveResult;
  /** Drop slot the cursor was over. `displayZone` here is the
   *  CURRENT display zone (may differ from `original.displayZone`). */
  target: {
    date: string;
    minutes: number | null;
    displayZone: string;
    disambiguation: DstDisambiguation;
  };
  native: PointerEvent | null;
}

/**
 * The ONE function that produces an `EventDropPayload` from a drop.
 *
 * **C2 — every drop path reaches THIS function exactly once.** Mouse
 * drop, keyboard Enter, touch end — they all funnel here. Outside of
 * this file, `applyMoveToEvent` is only called for preview ghost
 * geometry (which produces identical math, so preview-vs-commit
 * drift is structurally impossible).
 *
 * **Throws** `DstResolutionError` if `dstPolicy === 'reject'` and the
 * wall-time falls in a DST gap. The caller (composable) catches it
 * and translates to "drop suppressed".
 */
export function buildDropPayload<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(
  dstPolicy: DstPolicy,
  event: CalendarEvent<TMeta>,
  originalSnapshot: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  },
  target: CalendarDropTarget,
  mode: CalendarDragMode,
  native: PointerEvent | null,
): EventDropPayload<TMeta> {
  // C2 — single math entry. Throws DstResolutionError on reject+gap;
  // caller catches.
  const result: MoveResult = applyMoveToEvent(event, target, mode, dstPolicy);
  return {
    event,
    original: {
      start: originalSnapshot.start,
      ...(originalSnapshot.end !== undefined ? { end: originalSnapshot.end } : {}),
      displayZone: originalSnapshot.displayZone,
    },
    next: result,
    // Spread the input target so extra fields (`valid`) survive into
    // the payload. The canonical fields below are written explicitly
    // so the payload is structurally consistent across all drop sites.
    target: {
      ...target,
      date: target.date,
      minutes: target.minutes,
      displayZone: target.displayZone,
      disambiguation: (result.disambiguation ?? null) as DstDisambiguation,
    },
    native,
  };
}

export function applyMoveToEvent(
  event: CalendarEvent,
  target: CalendarDropTarget,
  mode: CalendarDragMode | null,
  dstPolicy: DstPolicy = 'compatible',
): MoveResult {
  // ── All-day branch ───────────────────────────────────────────────
  if (isAllDayEvent(event)) {
    const oldStart = event.start;
    const oldEnd = event.end ?? oldStart.add({ days: 1 });
    const targetPlain = Temporal.PlainDate.from(target.date);

    if (mode === 'allDay-resize-start' || mode === 'month-resize-start') {
      const maxStart = oldEnd.subtract({ days: 1 });
      const newStart =
        Temporal.PlainDate.compare(targetPlain, maxStart) > 0 ? maxStart : targetPlain;
      return { start: newStart, end: oldEnd };
    }
    if (mode === 'allDay-resize-end' || mode === 'month-resize-end') {
      // Drop target is the LAST visible day of the bar; the stored
      // `end` is exclusive, so add one day. Cap so end stays past
      // start.
      const minEndExcl = oldStart.add({ days: 1 });
      const newEndExcl = targetPlain.add({ days: 1 });
      const clamped =
        Temporal.PlainDate.compare(newEndExcl, minEndExcl) < 0 ? minEndExcl : newEndExcl;
      return { start: oldStart, end: clamped };
    }
    // Move (default): shift both dates by the same delta.
    const span = oldStart.until(oldEnd).total({ unit: 'days' });
    const newStart = targetPlain;
    const newEnd = newStart.add({ days: span });
    return event.end ? { start: newStart, end: newEnd } : { start: newStart };
  }

  // ── Timed branch ─────────────────────────────────────────────────
  // (Type guard above narrows; reassert here for the alternative
  // branch.)
  if (!isTimedEvent(event)) {
    // Mixed-shape events should have been rejected by validation,
    // but be defensive.
    throw new TypeError(
      `[applyMoveToEvent] event ${event.id} has unrecognised start shape`,
    );
  }

  // Article-4: each endpoint preserves its own source zone. For move
  // and resize-start the result anchors to the start's source zone;
  // for resize-end the result anchors to the end's source zone (or
  // start's if end is missing). Cross-zone events keep their flight
  // shape: dragging a Tokyo→Vienna flight to a new slot must NOT
  // re-write Vienna into Tokyo.
  const startSourceZone = event.start.timeZoneId;
  const endSourceZone = event.end?.timeZoneId ?? startSourceZone;
  const oldStartZdt = event.start;
  const oldEndZdt = event.end ?? null;

  const targetDate = Temporal.PlainDate.from(target.date);
  // Audit Session 3 #5 fix — reject timed→all-day-band drops.
  // Calendar UIs don't have a sensible "convert this timed event to
  // all-day" gesture in mid-drag; previously we silently re-anchored
  // wall-time which caused subtle DST drift. Now we throw a typed
  // error the lifecycle composable translates to "drop suppressed."
  // Same UX outcome as canDrop=false / DstResolutionError, but the
  // root cause is named explicitly in the message.
  if (target.minutes === null && (mode === 'timed' || mode === 'timed-resize-start' || mode === 'timed-resize-end')) {
    throw new TypeError(
      `[applyMoveToEvent] timed event ${event.id} cannot be dropped onto an all-day target (target.minutes === null). To convert a timed event to all-day, change the event's start to a Temporal.PlainDate explicitly in your event-source — the drop API does not auto-convert.`,
    );
  }
  // Resolve the target's wall-clock time in the DISPLAY zone, then
  // re-zone into the event's SOURCE zone so the event keeps its
  // article-4 intent.
  const targetTime = Temporal.PlainTime.from({
    hour: Math.floor((target.minutes as number) / 60),
    minute: (target.minutes as number) % 60,
  });

  // Article-5 disambiguation. Detect gap/overlap in the DISPLAY zone
  // (that's the zone the user's wall-clock click was anchored in)
  // and apply the active policy.
  const dstSituation = detectDstSituation(target.displayZone, {
    year: targetDate.year,
    month: targetDate.month,
    day: targetDate.day,
    hour: targetTime.hour,
    minute: targetTime.minute,
  });
  if (dstSituation && dstPolicy === 'reject') {
    throw new DstResolutionError(
      dstSituation,
      `[applyMoveToEvent] target ${target.date}T${String(targetTime.hour).padStart(2, '0')}:${String(targetTime.minute).padStart(2, '0')} is a DST ${dstSituation} in ${target.displayZone}; policy='reject'.`,
    );
  }
  // Audit Session 3 #7 cleanup — when policy is 'reject' AND we
  // get here (no dst-situation, so safe to proceed), use 'compatible'
  // as the no-op default. Explicit fallback keeps the C4 contract
  // honest: the cast happens AFTER we've proved disambiguation isn't
  // needed.
  const disambiguationOpt: 'compatible' | 'earlier' | 'later' =
    dstPolicy === 'reject'
      ? 'compatible' // safe: dstSituation === null proven above
      : dstPolicy;
  // Resolve via PlainDateTime → ZonedDateTime so we can pass the
  // explicit disambiguation option (the polyfill's
  // `PlainDate.toZonedDateTime({ plainTime })` overload doesn't take
  // it).
  const targetPdt = Temporal.PlainDateTime.from({
    year: targetDate.year,
    month: targetDate.month,
    day: targetDate.day,
    hour: targetTime.hour,
    minute: targetTime.minute,
  });
  const resolvedInDisplay = targetPdt.toZonedDateTime(target.displayZone, {
    disambiguation: disambiguationOpt,
  });
  // Anchored in the START's source zone; resize-end branches re-anchor
  // to END's source zone before returning. Move-default keeps both
  // endpoints in their respective source zones via duration arithmetic
  // applied per-side.
  const targetInStartZone = resolvedInDisplay.withTimeZone(startSourceZone);
  const targetInEndZone = resolvedInDisplay.withTimeZone(endSourceZone);
  const disamb: DstDisambiguation = dstSituation;

  if (mode === 'timed-resize-start') {
    // Move start; clamp to preserve a minimum duration before end.
    // start stays in startSourceZone, end stays in endSourceZone.
    let newStart = targetInStartZone;
    if (oldEndZdt) {
      const capStart = oldEndZdt
        .subtract({ minutes: MIN_RESIZE_MINUTES })
        .withTimeZone(startSourceZone);
      if (Temporal.Instant.compare(newStart.toInstant(), capStart.toInstant()) > 0) {
        newStart = capStart;
      }
    }
    return {
      start: newStart,
      ...(oldEndZdt ? { end: oldEndZdt } : {}),
      disambiguation: disamb,
    };
  }
  if (mode === 'timed-resize-end') {
    // Move end; clamp to preserve a minimum duration after start.
    // end re-anchored in endSourceZone (preserves cross-zone shape).
    const capEnd = oldStartZdt
      .add({ minutes: MIN_RESIZE_MINUTES })
      .withTimeZone(endSourceZone);
    let newEnd = targetInEndZone;
    if (Temporal.Instant.compare(newEnd.toInstant(), capEnd.toInstant()) < 0) {
      newEnd = capEnd;
    }
    return { start: oldStartZdt, end: newEnd, disambiguation: disamb };
  }

  // Month-view resize on a TIMED multi-day event: shift the start
  // date or the end date by the original-vs-target delta, preserving
  // the wall-time on that side. The other side stays untouched.
  // DST disambiguation is detected on the moved wall-time and
  // surfaced in the result so consumers can tell the user "we shifted
  // your meeting" (Article 5: explicit policy on every code path).
  if (mode === 'month-resize-start') {
    const oldStartInDisplay = oldStartZdt.withTimeZone(target.displayZone);
    const monthResizeStartDst = detectDstSituation(target.displayZone, {
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: oldStartInDisplay.hour,
      minute: oldStartInDisplay.minute,
      second: oldStartInDisplay.second,
    });
    if (monthResizeStartDst && dstPolicy === 'reject') {
      throw new DstResolutionError(
        monthResizeStartDst,
        `[applyMoveToEvent] month-resize-start lands in a DST ${monthResizeStartDst} in ${target.displayZone}; policy='reject'.`,
      );
    }
    const movedDisamb: 'compatible' | 'earlier' | 'later' =
      dstPolicy === 'reject'
        ? 'compatible'
        : (dstPolicy as 'compatible' | 'earlier' | 'later');
    const movedPdt = Temporal.PlainDateTime.from({
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: oldStartInDisplay.hour,
      minute: oldStartInDisplay.minute,
      second: oldStartInDisplay.second,
    });
    let newStart = movedPdt
      .toZonedDateTime(target.displayZone, { disambiguation: movedDisamb })
      .withTimeZone(startSourceZone);
    if (oldEndZdt) {
      const capStart = oldEndZdt
        .subtract({ minutes: MIN_RESIZE_MINUTES })
        .withTimeZone(startSourceZone);
      if (Temporal.Instant.compare(newStart.toInstant(), capStart.toInstant()) > 0) {
        newStart = capStart;
      }
    }
    return {
      start: newStart,
      ...(oldEndZdt ? { end: oldEndZdt } : {}),
      disambiguation: monthResizeStartDst,
    };
  }
  if (mode === 'month-resize-end') {
    const oldEndAnchor = oldEndZdt ?? oldStartZdt;
    const anchorZone = oldEndZdt ? endSourceZone : startSourceZone;
    const oldEndInDisplay = oldEndAnchor.withTimeZone(target.displayZone);
    const monthResizeEndDst = detectDstSituation(target.displayZone, {
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: oldEndInDisplay.hour,
      minute: oldEndInDisplay.minute,
      second: oldEndInDisplay.second,
    });
    if (monthResizeEndDst && dstPolicy === 'reject') {
      throw new DstResolutionError(
        monthResizeEndDst,
        `[applyMoveToEvent] month-resize-end lands in a DST ${monthResizeEndDst} in ${target.displayZone}; policy='reject'.`,
      );
    }
    const movedDisamb: 'compatible' | 'earlier' | 'later' =
      dstPolicy === 'reject'
        ? 'compatible'
        : (dstPolicy as 'compatible' | 'earlier' | 'later');
    const movedPdt = Temporal.PlainDateTime.from({
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: oldEndInDisplay.hour,
      minute: oldEndInDisplay.minute,
      second: oldEndInDisplay.second,
    });
    let newEnd = movedPdt
      .toZonedDateTime(target.displayZone, { disambiguation: movedDisamb })
      .withTimeZone(anchorZone);
    const capEnd = oldStartZdt
      .add({ minutes: MIN_RESIZE_MINUTES })
      .withTimeZone(anchorZone);
    if (Temporal.Instant.compare(newEnd.toInstant(), capEnd.toInstant()) < 0) {
      newEnd = capEnd;
    }
    return {
      start: oldStartZdt,
      end: newEnd,
      disambiguation: monthResizeEndDst,
    };
  }

  // Move (default): keep duration, shift start to target. Each
  // endpoint is materialised in ITS OWN source zone so a Tokyo→Vienna
  // flight survives the move with both flags intact.
  //
  // **Cross-zone DST duration (Audit Session 3 #12 doc):** for a
  // move-default, the elapsed-instant DURATION is preserved
  // (epochMs delta), NOT the wall-time-on-each-side. If the source
  // event spans a DST transition (e.g. Vienna 23:00 Sun → 04:00 Mon
  // crossing spring-forward = 4h elapsed wall-time but 5h elapsed
  // instant duration), the move keeps the 5h instant duration.
  //
  // This matches what every mainstream calendar (Google, Outlook,
  // Apple) does when you drag a meeting whose duration crosses DST:
  // the meeting stays the same physical length. Preserving wall-time
  // on each side independently would require shrinking/stretching
  // the meeting based on the target zone's DST schedule — surprising
  // and inconsistent with consumer expectations.
  //
  // For consumers who NEED wall-time-each-side preservation (rare —
  // typically scheduling-rule UIs, not direct manipulation), use
  // resize-start / resize-end on each endpoint independently.
  if (oldEndZdt) {
    const durationMs =
      oldEndZdt.epochMilliseconds - oldStartZdt.epochMilliseconds;
    const newEndInStart = targetInStartZone.add({ milliseconds: durationMs });
    const newEnd = newEndInStart.withTimeZone(endSourceZone);
    return { start: targetInStartZone, end: newEnd, disambiguation: disamb };
  }
  return { start: targetInStartZone, disambiguation: disamb };
}
