/**
 * Phase 8.10-M: prove the DST `disambiguation` flag from
 * `applyMoveToEvent` reaches the consumer's `onEventDrop` payload
 * through `useTimeGridDnd`'s keyboard commit path. Earlier suites
 * tested the math in isolation — this one pins the wiring.
 */

import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../core';
import { zdt } from '../__test-utils__/event-fixtures';
import {
  useTimeGridDnd,
  type TimeGridEventDropPayload,
  type UseTimeGridDndReturn,
} from './useTimeGridDnd';

function harness(
  events: ReadonlyArray<CalendarEvent>,
  timezone: string,
  onEventDrop: (p: TimeGridEventDropPayload) => void,
) {
  const days = ref(
    ['2026-03-28', '2026-03-29'].map((d) => Temporal.PlainDate.from(d)),
  );
  const timeRange = ref<readonly [number, number]>([0, 24]);
  const pixelsPerHour = ref(60);
  const slotDuration = ref<5 | 10 | 15 | 30 | 60>(30);
  const topBuffer = ref(0);
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
        timezone,
        surfaceRef: surface,
        columnsRef: cols,
        allDayColumnsRef: allDayCols,
        topBufferMinutes: topBuffer,
        onEventDrop,
      });
      return () => h('div');
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api: api! };
}

describe('useTimeGridDnd — disambiguation forwarding', () => {
  it('keyboard arrow shift across DST gap surfaces target.disambiguation="gap" in onEventDrop payload', async () => {
    const drops: TimeGridEventDropPayload[] = [];
    const event: CalendarEvent = {
      id: 'standup',
      // 02:30 Vienna on 2026-03-28 (the day BEFORE spring-forward).
      start: zdt('2026-03-28T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-03-28T03:00:00', 'Europe/Vienna'),
    };
    const { api, wrapper } = harness([event], 'Europe/Vienna', (p) => drops.push(p));

    // ArrowRight stages a move to 02:30 on 2026-03-29 — which is in
    // the spring-forward gap. compatible policy shifts to 03:30 and
    // sets disambiguation='gap'.
    api.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      event,
    );
    await nextTick();
    api.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'Enter' }),
      event,
    );
    await nextTick();

    expect(drops.length).toBe(1);
    const payload = drops[0];
    expect(payload.target.displayZone).toBe('Europe/Vienna');
    expect(payload.target.disambiguation).toBe('gap');
    // Source-zone preserved on the new start.
    const newStart = payload.next.start as Temporal.ZonedDateTime;
    expect(newStart.timeZoneId).toBe('Europe/Vienna');
    // Wall-time is the post-gap shifted value (03:30, not 02:30).
    expect(newStart.hour).toBe(3);
    expect(newStart.minute).toBe(30);

    wrapper.unmount();
  });

  it('clean (non-DST) keyboard move surfaces disambiguation=null', async () => {
    const drops: TimeGridEventDropPayload[] = [];
    const event: CalendarEvent = {
      id: 'standup',
      start: zdt('2026-04-15T10:00:00', 'Europe/Vienna'),
      end: zdt('2026-04-15T11:00:00', 'Europe/Vienna'),
    };
    const { api, wrapper } = harness(
      [event],
      'Europe/Vienna',
      (p) => drops.push(p),
    );
    api.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
      event,
    );
    await nextTick();
    api.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'Enter' }),
      event,
    );
    await nextTick();
    expect(drops.length).toBe(1);
    expect(drops[0].target.disambiguation).toBe(null);
    expect(drops[0].target.displayZone).toBe('Europe/Vienna');
    wrapper.unmount();
  });
});
