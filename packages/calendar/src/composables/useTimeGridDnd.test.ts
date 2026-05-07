/**
 * Tests for `useTimeGridDnd` — the time-grid DnD glue composable.
 *
 * Scope: keyboard moves (arrow + shift+arrow) for timed events,
 * canDrop veto, single-day arrow-suppression, isPreviewEvent
 * predicate. Pointer-driven dnd is exercised by useCalendarDnd's
 * own tests + by the playground.
 */

import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../core';
import { pd, zdt } from '../__test-utils__/event-fixtures';
import {
  useTimeGridDnd,
  type TimeGridEventDropPayload,
  type UseTimeGridDndReturn,
} from './useTimeGridDnd';
import type { MoveResult } from '../core/dnd/move-math';

function harness(
  events: ReadonlyArray<CalendarEvent>,
  opts?: {
    days?: ReadonlyArray<string>;
    canDrop?: (e: CalendarEvent, t: { date: string; minutes: number | null }) => boolean;
    onEventDrop?: (payload: TimeGridEventDropPayload) => void;
    timezone?: string;
  },
) {
  const days = ref(
    (opts?.days ?? ['2026-04-13', '2026-04-14', '2026-04-15']).map((d) =>
      Temporal.PlainDate.from(d),
    ),
  );
  const timeRange = ref<readonly [number, number]>([0, 24]);
  const pixelsPerHour = ref(60);
  const slotDuration = ref<5 | 10 | 15 | 30 | 60>(30);
  const topBuffer = ref(15);
  const surface = ref<HTMLElement | null>(null);
  const cols = ref<HTMLElement | null>(null);
  const allDayCols = ref<HTMLElement | null>(null);

  let api: UseTimeGridDndReturn | undefined;
  const Comp = defineComponent({
    setup() {
      api = useTimeGridDnd({
        events: () => events,
        days,
        timeRange,
        pixelsPerHour,
        slotDuration,
        timezone: opts?.timezone ?? 'UTC',
        surfaceRef: surface,
        columnsRef: cols,
        allDayColumnsRef: allDayCols,
        topBufferMinutes: topBuffer,
        canDrop: opts?.canDrop,
        onEventDrop: opts?.onEventDrop,
      });
      return () => h('div');
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api: api! };
}

/** Helper: extract a comparable `{ start, end? }` snapshot from a MoveResult, ZDT-side. */
function zdtSnapshot(next: MoveResult): { start: string; end?: string } {
  const start = (next.start as Temporal.ZonedDateTime).toInstant().toString();
  const end =
    next.end === undefined
      ? undefined
      : (next.end as Temporal.ZonedDateTime).toInstant().toString();
  return end === undefined ? { start } : { start, end };
}

describe('useTimeGridDnd', () => {
  it('isPreviewEvent returns false when nothing is dragged', () => {
    const { api } = harness([]);
    expect(api.isPreviewEvent('any')).toBe(false);
  });

  it('workingEvents passes through when not dragging', () => {
    const events: CalendarEvent[] = [
      { id: '1', start: zdt('2026-04-15T09:00:00'), end: zdt('2026-04-15T10:00:00'), meta: {} },
    ];
    const { api } = harness(events);
    expect(api.workingEvents.value).toEqual(events);
  });

  describe('keyboard arrow-up / arrow-down move (preview / commit / cancel)', () => {
    it('arrow keys build the preview WITHOUT committing — Enter commits', () => {
      const drops: TimeGridEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });

      // First arrow stages a preview (no drop yet).
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      expect(drops).toHaveLength(0);
      expect(zdtSnapshot(api.keyboardDrag.value!.next)).toEqual({
        start: '2026-04-15T09:30:00Z',
        end: '2026-04-15T10:30:00Z',
      });

      // Second arrow accumulates onto the preview.
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      expect(drops).toHaveLength(0);
      expect(zdtSnapshot(api.keyboardDrag.value!.next)).toEqual({
        start: '2026-04-15T10:00:00Z',
        end: '2026-04-15T11:00:00Z',
      });

      // Enter commits the accumulated preview.
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(drops).toHaveLength(1);
      expect(zdtSnapshot(drops[0].next)).toEqual({
        start: '2026-04-15T10:00:00Z',
        end: '2026-04-15T11:00:00Z',
      });
      expect(api.keyboardDrag.value).toBeNull();
    });

    it('Escape cancels an in-flight preview without committing', () => {
      const drops: TimeGridEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      expect(api.keyboardDrag.value).not.toBeNull();
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), event);
      expect(drops).toHaveLength(0);
      expect(api.keyboardDrag.value).toBeNull();
    });

    it('ignores up/down on all-day events', () => {
      const onEventDrop = vi.fn() as unknown as (p: TimeGridEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], { onEventDrop });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      expect(api.keyboardDrag.value).toBeNull();
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(onEventDrop).not.toHaveBeenCalled();
    });
  });

  describe('shift+arrow timed resize', () => {
    it('Shift+ArrowDown stages a resize-end preview, Enter commits', () => {
      const drops: TimeGridEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onEventKeydown(
        new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }),
        event,
      );
      expect(drops).toHaveLength(0);
      expect(zdtSnapshot(api.keyboardDrag.value!.next)).toEqual({
        start: '2026-04-15T09:00:00Z',
        end: '2026-04-15T10:30:00Z',
      });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(zdtSnapshot(drops[0].next)).toEqual({
        start: '2026-04-15T09:00:00Z',
        end: '2026-04-15T10:30:00Z',
      });
    });
  });

  describe('keyboard arrow-left / arrow-right day shift', () => {
    it('moves a timed event ±1 day on left/right + commit on Enter', () => {
      const drops: TimeGridEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect((drops[0].next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-16T09:00:00Z',
      );
    });

    it('suppresses left/right in single-day view', () => {
      const onEventDrop = vi.fn() as unknown as (p: TimeGridEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        days: ['2026-04-15'],
        onEventDrop,
      });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      expect(api.keyboardDrag.value).toBeNull();
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it('preserves wall-time across DST when shifting by ±1 day (Article 5)', () => {
      // 2026-03-29 is Europe/Vienna spring-forward (DST starts at 02:00→03:00).
      // ArrowRight from Sat 28 should keep wall-clock 10:00 in Vienna,
      // which lands at 08:00 UTC on Sun 29 (DST is now active).
      const drops: TimeGridEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-03-28T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-03-28T11:00:00', 'Europe/Vienna'),
        meta: {},
      };
      const { api } = harness([event], {
        days: ['2026-03-27', '2026-03-28', '2026-03-29'],
        timezone: 'Europe/Vienna',
        onEventDrop: (p) => drops.push(p),
      });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      const newStart = drops[0].next.start as Temporal.ZonedDateTime;
      // Wall-clock preserved at 10:00 Vienna on 2026-03-29.
      expect(newStart.year).toBe(2026);
      expect(newStart.month).toBe(3);
      expect(newStart.day).toBe(29);
      expect(newStart.hour).toBe(10);
      expect(newStart.minute).toBe(0);
      expect(newStart.timeZoneId).toBe('Europe/Vienna');
      // DST active in Vienna on 03-29 → 10:00 Vienna = 08:00 UTC.
      expect(newStart.toInstant().toString()).toBe('2026-03-29T08:00:00Z');
    });
  });

  describe('canDrop veto', () => {
    it('suppresses the commit when canDrop returns false (Enter on invalid target)', () => {
      const onEventDrop = vi.fn() as unknown as (p: TimeGridEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], { canDrop: () => false, onEventDrop });
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      api.onEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(onEventDrop).not.toHaveBeenCalled();
      // Preview is cleared even though canDrop vetoed the commit.
      expect(api.keyboardDrag.value).toBeNull();
    });
  });
});
