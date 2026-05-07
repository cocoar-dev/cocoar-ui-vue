/**
 * Tests for the DnD layer.
 *
 * Two scopes:
 *
 *   1. `applyMoveToEvent` — the pure-function move/resize math
 *      shared between the live preview ghost (during drag) and the
 *      `event-drop` payload (on release). Property-style cases:
 *      timed move, timed resize, all-day move, all-day resize,
 *      month-view multi-day resize, min-duration clamps.
 *
 *   2. `useCalendarDnd` lifecycle — start → move → release with
 *      mocked pointer events. Covers valid-drop emission,
 *      invalid-drop suppression, the Phase 3.5 snap-back timing,
 *      and Esc-cancel.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../core';
import { pd, zdt } from '../__test-utils__/event-fixtures';
import {
  applyMoveToEvent,
  useCalendarDnd,
  type CalendarDropTarget,
  type UseCalendarDndOptions,
  type UseCalendarDndReturn,
} from './useCalendarDnd';

// ─────────────────────────────────────────────────────────────────
// applyMoveToEvent — pure function math
// ─────────────────────────────────────────────────────────────────

describe('applyMoveToEvent', () => {
  const target = (
    date: string,
    minutes: number | null,
    displayZone = 'UTC',
  ): CalendarDropTarget => ({
    date,
    minutes,
    displayZone,
    valid: true,
  });

  /** Helper: format a ZDT/PD result side as a stable string. */
  const s = (v: Temporal.ZonedDateTime | Temporal.PlainDate | undefined): string | undefined =>
    v === undefined ? undefined : v.toString();

  describe('timed events — move', () => {
    it('shifts start to target instant and keeps duration', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:30:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-16', 11 * 60), 'timed');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-16T11:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-16T12:30:00Z',
      );
    });

    it('preserves end being undefined', () => {
      const ev: CalendarEvent = { id: 'a', start: zdt('2026-04-15T09:00:00') };
      const next = applyMoveToEvent(ev, target('2026-04-15', 600), 'timed');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T10:00:00Z',
      );
      expect(next.end).toBeUndefined();
    });

    it('mode=null defaults to move', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-15', 600), null);
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T10:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T11:00:00Z',
      );
    });
  });

  describe('timed events — resize', () => {
    it('timed-resize-start: only start moves, end fixed', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:30:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-15', 8 * 60), 'timed-resize-start');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T08:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T10:30:00Z',
      );
    });

    it('timed-resize-end: only end moves, start fixed', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:30:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-15', 12 * 60), 'timed-resize-end');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T09:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T12:00:00Z',
      );
    });

    it('timed-resize-start clamps to keep min 15-minute duration before end', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
      };
      // Try to drag start past end (target 10:30 = past end 10:00)
      const next = applyMoveToEvent(ev, target('2026-04-15', 10 * 60 + 30), 'timed-resize-start');
      // Clamped to end - 15 min = 09:45.
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T09:45:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T10:00:00Z',
      );
    });

    it('timed-resize-end clamps to keep min 15-minute duration after start', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
      };
      // Try to drag end before start (target 8:30 = before start 9:00).
      const next = applyMoveToEvent(ev, target('2026-04-15', 8 * 60 + 30), 'timed-resize-end');
      // Clamped to start + 15 min = 09:15.
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T09:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T09:15:00Z',
      );
    });
  });

  describe('all-day events — move', () => {
    it('shifts a single-day all-day event to a new date', () => {
      const ev: CalendarEvent = { id: 'a', start: pd('2026-04-15') };
      const next = applyMoveToEvent(ev, target('2026-04-20', null), 'allDay');
      expect(s(next.start)).toBe('2026-04-20');
      expect(next.end).toBeUndefined();
    });

    it('shifts a multi-day all-day event preserving span', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-13'),
        end: pd('2026-04-16'),
      }; // 3-day span (end exclusive)
      const next = applyMoveToEvent(ev, target('2026-04-20', null), 'allDay');
      expect(s(next.start)).toBe('2026-04-20');
      expect(s(next.end)).toBe('2026-04-23'); // 3-day span preserved
    });

    it('handles month mode the same way as allDay (move)', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-13'),
        end: pd('2026-04-16'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-20', null), 'month');
      expect(s(next.start)).toBe('2026-04-20');
      expect(s(next.end)).toBe('2026-04-23');
    });
  });

  describe('all-day events — resize', () => {
    it('allDay-resize-start moves start, keeps end', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-18'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-13', null), 'allDay-resize-start');
      expect(s(next.start)).toBe('2026-04-13');
      expect(s(next.end)).toBe('2026-04-18');
    });

    it('allDay-resize-end moves end exclusive (visible last day +1)', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-17'),
      };
      // Drag end handle to the visible last day 2026-04-19 → end becomes 2026-04-20.
      const next = applyMoveToEvent(ev, target('2026-04-19', null), 'allDay-resize-end');
      expect(s(next.start)).toBe('2026-04-15');
      expect(s(next.end)).toBe('2026-04-20');
    });

    it('allDay-resize-start clamps to keep at least 1-day visible (start < end)', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-17'),
      };
      // Drag start past end (2026-04-20 > end 2026-04-17). Cap to end-1day = 2026-04-16.
      const next = applyMoveToEvent(ev, target('2026-04-20', null), 'allDay-resize-start');
      expect(s(next.start)).toBe('2026-04-16');
      expect(s(next.end)).toBe('2026-04-17');
    });

    it('allDay-resize-end clamps so end stays past start', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-17'),
      };
      // Drag end handle before start (2026-04-10 < start 2026-04-15).
      // Cap → start+1day = 2026-04-16.
      const next = applyMoveToEvent(ev, target('2026-04-10', null), 'allDay-resize-end');
      expect(s(next.start)).toBe('2026-04-15');
      expect(s(next.end)).toBe('2026-04-16');
    });
  });

  describe('month-view resize on a TIMED multi-day event', () => {
    it('month-resize-start shifts start date, preserves wall-time and end', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-17T17:00:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-13', null), 'month-resize-start');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-13T09:00:00Z',
      ); // wall-time preserved
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-17T17:00:00Z',
      );
    });

    it('month-resize-end shifts end date, preserves wall-time and start', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-17T17:00:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-20', null), 'month-resize-end');
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-15T09:00:00Z',
      );
      expect((next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-20T17:00:00Z',
      );
    });

    it('month-resize-start clamps to MIN_RESIZE_MINUTES before end', () => {
      const ev: CalendarEvent = {
        id: 'a',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T09:30:00'),
      };
      // Drag start to a target that would pass end → clamp.
      const next = applyMoveToEvent(ev, target('2026-04-16', null), 'month-resize-start');
      // 09:00 -> 04-16 09:00 would be after end 04-15 09:30 → cap to end-15min.
      const clampedStart = Temporal.Instant.from('2026-04-15T09:30:00Z')
        .subtract({ minutes: 15 })
        .toString();
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(clampedStart);
    });
  });

  describe('cross-zone (Article-4 anchoring)', () => {
    it('Vienna summer (DST on, +02:00): drop on 14:00 Vienna → 12:00 UTC instant', () => {
      // Event at 10:00 Vienna (= 08:00 UTC) on 2026-06-15.
      const ev: CalendarEvent = {
        id: 'meeting',
        start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-06-15', 14 * 60, 'Europe/Vienna'),
        'timed',
      );
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-06-15T12:00:00Z',
      );
      // Source zone preserved.
      expect((next.start as Temporal.ZonedDateTime).timeZoneId).toBe('Europe/Vienna');
    });

    it('Vienna winter (DST off, +01:00): drop on 14:00 Vienna → 13:00 UTC instant', () => {
      const ev: CalendarEvent = {
        id: 'meeting',
        start: zdt('2026-12-15T10:00:00', 'Europe/Vienna'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-12-15', 14 * 60, 'Europe/Vienna'),
        'timed',
      );
      expect((next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-12-15T13:00:00Z',
      );
      expect((next.start as Temporal.ZonedDateTime).timeZoneId).toBe('Europe/Vienna');
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// useCalendarDnd lifecycle — composable mounted in a test harness
// ─────────────────────────────────────────────────────────────────

interface Harness {
  dnd: UseCalendarDndReturn;
  surface: HTMLElement;
  columns: HTMLElement;
  unmount: () => void;
}

/**
 * Mount a tiny wrapper that calls `useCalendarDnd` with a synthetic
 * surface + columns container so we can dispatch pointer events
 * against real DOM. The wrapper exposes the composable return so
 * tests can inspect `isDragging` / `dropTarget` / `snappingBack`.
 */
function mountHarness(opts: {
  canDrop?: UseCalendarDndOptions['canDrop'];
  onEventDrop?: UseCalendarDndOptions['onEventDrop'];
  onEventClick?: UseCalendarDndOptions['onEventClick'];
  days?: Temporal.PlainDate[];
  pixelsPerHour?: number;
  bufferMinutes?: number;
} = {}): Harness {
  const surface = document.createElement('div');
  Object.assign(surface.style, { width: '700px', height: '500px' });
  const columns = document.createElement('div');
  Object.assign(columns.style, { width: '700px', height: '1470px' });
  // Stub getBoundingClientRect for jsdom-like environments where
  // layout doesn't run. happy-dom uses 0×0 by default.
  surface.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 700, bottom: 500, width: 700, height: 500 }) as DOMRect;
  columns.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 700, bottom: 1470, width: 700, height: 1470 }) as DOMRect;
  document.body.appendChild(surface);
  document.body.appendChild(columns);

  const days = opts.days ?? [
    Temporal.PlainDate.from('2026-04-13'),
    Temporal.PlainDate.from('2026-04-14'),
    Temporal.PlainDate.from('2026-04-15'),
    Temporal.PlainDate.from('2026-04-16'),
    Temporal.PlainDate.from('2026-04-17'),
    Temporal.PlainDate.from('2026-04-18'),
    Temporal.PlainDate.from('2026-04-19'),
  ];

  let dnd!: UseCalendarDndReturn;
  const wrapper = mount(
    defineComponent({
      setup() {
        const sRef: Ref<HTMLElement | null> = ref(surface);
        const cRef: Ref<HTMLElement | null> = ref(columns);
        dnd = useCalendarDnd({
          surfaceRef: sRef,
          columnsRef: cRef,
          days: ref(days),
          timeRange: ref([0, 24] as [number, number]),
          pixelsPerHour: ref(opts.pixelsPerHour ?? 60),
          slotDuration: ref(30),
          timezone: ref('UTC'),
          timeGridTopBufferMinutes: ref(opts.bufferMinutes ?? 0),
          canDrop: opts.canDrop,
          onEventDrop: opts.onEventDrop,
          onEventClick: opts.onEventClick,
        });
        return () => h('div');
      },
    }),
    { attachTo: document.body },
  );

  return {
    dnd,
    surface,
    columns,
    unmount: () => {
      wrapper.unmount();
      surface.remove();
      columns.remove();
    },
  };
}

function pointerEvent(type: string, init: { clientX: number; clientY: number; button?: number }): PointerEvent {
  // happy-dom doesn't have PointerEvent — fall back to MouseEvent
  // and pretend it's a PointerEvent for the listener typing.
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
    button: init.button ?? 0,
  });
  // Stamp a pointerId so the source pointer-capture API doesn't error.
  Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
  return ev as unknown as PointerEvent;
}

/**
 * Wait for the next requestAnimationFrame so the drag's tick loop
 * (threshold check, onDragMove dispatch) actually runs.
 */
function flushRaf(): Promise<void> {
  return new Promise((res) => requestAnimationFrame(() => res()));
}

const baseEvent: CalendarEvent = {
  id: 'standup',
  start: zdt('2026-04-15T09:00:00'),
  end: zdt('2026-04-15T09:30:00'),
};

describe('useCalendarDnd — drag lifecycle', () => {
  let harness: Harness;
  let onEventDrop: ReturnType<typeof vi.fn>;
  let onEventClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onEventDrop = vi.fn();
    onEventClick = vi.fn();
    harness = mountHarness({
      onEventDrop: onEventDrop as unknown as UseCalendarDndOptions['onEventDrop'],
      onEventClick: onEventClick as unknown as UseCalendarDndOptions['onEventClick'],
    });
  });
  afterEach(() => {
    harness.unmount();
  });

  it('is idle until pointer crosses the drag threshold', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    // Synthetic pointerdown — we have no real "card" element so we
    // dispatch directly on the surface.
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    await flushRaf();
    // No movement yet → not dragging.
    expect(harness.dnd.isDragging.value).toBe(false);
  });

  it('flips isDragging once the pointer moves past threshold and resolves a drop target', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    // Move pointer significantly past threshold (default ~5 px).
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 350, clientY: 600 }));
    await flushRaf();
    expect(harness.dnd.isDragging.value).toBe(true);
    expect(harness.dnd.dragMode.value).toBe('timed');
    // Drop target reflects the pointer's slot — clientX 350 with
    // 7 columns × 100 px = column 3 (Thu Apr 16).
    expect(harness.dnd.dropTarget.value?.date).toBe('2026-04-16');
    expect(harness.dnd.dropTarget.value?.valid).toBe(true);
  });

  it('emits onEventDrop on valid release with applyMoveToEvent payload', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 450, clientY: 660 }));
    await flushRaf();
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 450, clientY: 660 }));
    expect(onEventDrop).toHaveBeenCalledTimes(1);
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.event.id).toBe('standup');
    expect(payload.target.valid).toBe(true);
    // applyMoveToEvent already covered above; just verify the chain.
    // payload.next.start is a Temporal.ZonedDateTime.
    const startStr = (payload.next.start as Temporal.ZonedDateTime).toString();
    expect(startStr).toMatch(/^2026-04-1\d/);
  });

  it('treats a release without movement as a click (onEventClick)', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    // Release at the same coords — no threshold crossed.
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 350, clientY: 540 }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it('clears state after a valid drop', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 450, clientY: 660 }));
    await flushRaf();
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 450, clientY: 660 }));
    expect(harness.dnd.isDragging.value).toBe(false);
    expect(harness.dnd.dropTarget.value).toBeNull();
    expect(harness.dnd.dragMode.value).toBeNull();
    expect(harness.dnd.snappingBack.value).toBe(false);
  });
});

describe('useCalendarDnd — invalid drop snap-back', () => {
  let harness: Harness;
  let onEventDrop: ReturnType<typeof vi.fn>;
  let canDrop: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onEventDrop = vi.fn();
    canDrop = vi.fn(() => false); // veto every target
    harness = mountHarness({
      onEventDrop: onEventDrop as unknown as UseCalendarDndOptions['onEventDrop'],
      canDrop: canDrop as unknown as UseCalendarDndOptions['canDrop'],
    });
  });
  afterEach(() => {
    harness.unmount();
  });

  it('does not fire onEventDrop when canDrop vetoes', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 450, clientY: 660 }));
    await flushRaf();
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 450, clientY: 660 }));
    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it('flags snappingBack and keeps dropTarget rendered for ~220 ms', async () => {
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 450, clientY: 660 }));
    await flushRaf();
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 450, clientY: 660 }));

    // Immediately after release the snap-back phase begins.
    expect(harness.dnd.snappingBack.value).toBe(true);
    expect(harness.dnd.dropTarget.value).not.toBeNull();
    expect(harness.dnd.dropTarget.value?.valid).toBe(false);
    // dragMode is held through the animation so the ghost stays
    // typed correctly in the views.
    expect(harness.dnd.dragMode.value).toBe('timed');

    // Wait the snap-back duration + a frame.
    await new Promise((res) => setTimeout(res, 250));
    expect(harness.dnd.snappingBack.value).toBe(false);
    expect(harness.dnd.dropTarget.value).toBeNull();
    expect(harness.dnd.dragMode.value).toBeNull();
  });
});

describe('useCalendarDnd — hit-test buffer', () => {
  it('clamps clicks in the leading buffer zone to minute 0 of the time range', async () => {
    const onEventDrop = vi.fn();
    const harness = mountHarness({
      onEventDrop: onEventDrop as unknown as UseCalendarDndOptions['onEventDrop'],
      bufferMinutes: 15,
      pixelsPerHour: 60,
    });
    // Pointer at clientY=8 (inside the 15-min / 15-px buffer at the
    // top of the columns container). Without the clamp this would
    // resolve to a negative minute which `pointToSlot` filters out
    // entirely; with the clamp it should land at minute 0 of the
    // time range.
    const handler = harness.dnd.startDrag(baseEvent);
    handler(pointerEvent('pointerdown', { clientX: 350, clientY: 540 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 350, clientY: 8 }));
    await flushRaf();
    expect(harness.dnd.isDragging.value).toBe(true);
    const target = harness.dnd.dropTarget.value;
    expect(target).not.toBeNull();
    expect(target?.minutes).toBe(0);
    window.dispatchEvent(pointerEvent('pointerup', { clientX: 350, clientY: 8 }));
    harness.unmount();
  });
});
