/**
 * Tests for `useMonthDnd` — the month-view DnD glue composable.
 *
 * Scope: keyboard-driven move math (arrow keys + shift+arrow for
 * all-day resize), `canDrop` veto, preview-id helper, isInvalidPillTarget
 * gating. Pointer-driven dnd lifecycle (start/move/release) is covered
 * by `useCalendarDnd.test.ts`.
 */

import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import {
  monthGridDates,
  type CalendarEvent,
} from '../core';
import { pd, zdt } from '../__test-utils__/event-fixtures';
import {
  useMonthDnd,
  type MonthEventDropPayload,
  type UseMonthDndReturn,
} from './useMonthDnd';
import type { MoveResult } from '../core/dnd/move-math';

function harness(events: ReadonlyArray<CalendarEvent>, opts?: {
  canDrop?: (e: CalendarEvent, target: { date: string; minutes: number | null }) => boolean;
  onEventDrop?: (payload: MonthEventDropPayload) => void;
}) {
  const yearMonth = Temporal.PlainYearMonth.from('2026-04');
  const gridDates = ref(monthGridDates(yearMonth, 1));
  const gridRef = ref<HTMLElement | null>(null);
  let api: UseMonthDndReturn | undefined;

  const Comp = defineComponent({
    setup() {
      api = useMonthDnd({
        events: () => events,
        gridDates,
        gridRef,
        timezone: 'UTC',
        canDrop: opts?.canDrop,
        onEventDrop: opts?.onEventDrop,
      });
      return () => h('div');
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api: api! };
}

/** Helper: format an all-day MoveResult as `{ start, end? }` strings. */
function pdSnapshot(next: MoveResult): { start: string; end?: string } {
  const start = (next.start as Temporal.PlainDate).toString();
  const end =
    next.end === undefined ? undefined : (next.end as Temporal.PlainDate).toString();
  return end === undefined ? { start } : { start, end };
}

describe('useMonthDnd', () => {
  describe('isPreviewId', () => {
    it('returns false when nothing is being dragged', () => {
      const { api } = harness([]);
      expect(api.isPreviewId('any-id')).toBe(false);
    });
  });

  describe('workingEvents', () => {
    it('passes through the events array verbatim when not dragging', () => {
      const events: CalendarEvent[] = [
        { id: '1', start: pd('2026-04-15'), meta: { title: 'A' } },
      ];
      const { api } = harness(events);
      expect(api.workingEvents.value).toEqual(events);
    });
  });

  describe('invalidMonthGhost / isInvalidPillTarget', () => {
    it('returns null when no drag is active', () => {
      const { api } = harness([]);
      expect(api.invalidMonthGhost.value).toBeNull();
      expect(
        api.isInvalidPillTarget(Temporal.PlainDate.from('2026-04-15')),
      ).toBe(false);
    });
  });

  describe('onMonthEventKeydown — all-day move', () => {
    it('arrow keys stage a preview WITHOUT committing — Enter commits', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 'allday',
        start: pd('2026-04-15'),
        end: pd('2026-04-17'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(
        new KeyboardEvent('keydown', { key: 'ArrowRight' }),
        event,
      );
      expect(drops).toHaveLength(0);
      expect(pdSnapshot(api.keyboardDrag.value!.next)).toEqual({
        start: '2026-04-16',
        end: '2026-04-18',
      });
      api.onMonthEventKeydown(
        new KeyboardEvent('keydown', { key: 'Enter' }),
        event,
      );
      expect(drops).toHaveLength(1);
      expect(pdSnapshot(drops[0].next)).toEqual({ start: '2026-04-16', end: '2026-04-18' });
      expect(api.keyboardDrag.value).toBeNull();
    });

    it('subsequent arrows accumulate onto the preview before commit', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), event);
      expect(drops).toHaveLength(0);
      expect((api.keyboardDrag.value!.next.start as Temporal.PlainDate).toString()).toBe(
        '2026-04-29',
      );
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect((drops[0].next.start as Temporal.PlainDate).toString()).toBe('2026-04-29');
    });

    it('Escape cancels an in-flight preview', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      expect(api.keyboardDrag.value).not.toBeNull();
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), event);
      expect(drops).toHaveLength(0);
      expect(api.keyboardDrag.value).toBeNull();
    });
  });

  describe('onMonthEventKeydown — shift+arrow resize', () => {
    it('Shift+ArrowRight extends the end → Enter commits', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-17'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(
        new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }),
        event,
      );
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(pdSnapshot(drops[0].next)).toEqual({ start: '2026-04-15', end: '2026-04-18' });
    });

    it('clamps to start+1 when shrinking past start', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        end: pd('2026-04-16'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }),
        event,
      );
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(pdSnapshot(drops[0].next)).toEqual({ start: '2026-04-15', end: '2026-04-16' });
    });
  });

  describe('onMonthEventKeydown — timed events', () => {
    it('arrow stages a ±24h preview, Enter commits', () => {
      const drops: MonthEventDropPayload[] = [];
      const event: CalendarEvent = {
        id: 't',
        start: zdt('2026-04-15T09:00:00'),
        end: zdt('2026-04-15T10:00:00'),
        meta: {},
      };
      const { api } = harness([event], {
        onEventDrop: (p) => drops.push(p),
      });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect((drops[0].next.start as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-16T09:00:00Z',
      );
      expect((drops[0].next.end as Temporal.ZonedDateTime).toInstant().toString()).toBe(
        '2026-04-16T10:00:00Z',
      );
    });
  });

  describe('canDrop veto', () => {
    it('suppresses commit when canDrop returns false (Enter on invalid target)', () => {
      const onEventDrop = vi.fn() as unknown as (p: MonthEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], {
        canDrop: () => false,
        onEventDrop,
      });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(onEventDrop).not.toHaveBeenCalled();
      expect(api.keyboardDrag.value).toBeNull();
    });

    it('still emits when canDrop returns true', () => {
      const onEventDrop = vi.fn() as unknown as (p: MonthEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], {
        canDrop: () => true,
        onEventDrop,
      });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), event);
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), event);
      expect(onEventDrop).toHaveBeenCalledTimes(1);
    });
  });

  describe('onMonthEventKeydown — non-arrow / Escape', () => {
    it('ignores keys other than arrows + escape + enter', () => {
      const onEventDrop = vi.fn() as unknown as (p: MonthEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], { onEventDrop });
      api.onMonthEventKeydown(new KeyboardEvent('keydown', { key: 'a' }), event);
      expect(onEventDrop).not.toHaveBeenCalled();
      expect(api.keyboardDrag.value).toBeNull();
    });

    it('Escape with no active drag blurs and does nothing', () => {
      const onEventDrop = vi.fn() as unknown as (p: MonthEventDropPayload) => void;
      const event: CalendarEvent = {
        id: 'a',
        start: pd('2026-04-15'),
        meta: {},
      };
      const { api } = harness([event], { onEventDrop });
      const el = document.createElement('button');
      document.body.appendChild(el);
      el.focus();
      const evt = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(evt, 'currentTarget', { value: el });
      api.onMonthEventKeydown(evt, event);
      expect(onEventDrop).not.toHaveBeenCalled();
      document.body.removeChild(el);
    });
  });
});
