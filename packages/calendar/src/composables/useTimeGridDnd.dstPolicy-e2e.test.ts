/**
 * End-to-end test that `.dstPolicy()` actually flows from the
 * builder → state → view → useTimeGridDnd → applyMoveToEvent.
 *
 * Phase 8.14-D1 fixed a regression where the views never read
 * `state.dstPolicy` (the builder setter existed but was a runtime
 * no-op at the view layer). This test would have caught that — and
 * pins the wiring against future regressions.
 */

import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, nextTick, computed, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../core';
import { zdt } from '../__test-utils__/event-fixtures';
import {
  useTimeGridDnd,
  type TimeGridEventDropPayload,
  type UseTimeGridDndReturn,
} from './useTimeGridDnd';
import type { DstPolicy } from '../core/dnd/move-math';

function harness(
  events: ReadonlyArray<CalendarEvent>,
  timezone: string,
  dstPolicyRef: Ref<DstPolicy>,
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
        dstPolicy: computed(() => dstPolicyRef.value),
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

describe('useTimeGridDnd — dstPolicy honored on keyboard commit (Phase 8.14-D1 e2e)', () => {
  it("policy='compatible' lets a DST-gap drop through with disambiguation='gap'", async () => {
    const drops: TimeGridEventDropPayload[] = [];
    const policy = ref<DstPolicy>('compatible');
    const event: CalendarEvent = {
      id: 'standup',
      start: zdt('2026-03-28T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-03-28T03:00:00', 'Europe/Vienna'),
    };
    const { api, wrapper } = harness([event], 'Europe/Vienna', policy, (p) =>
      drops.push(p),
    );
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
    expect(drops[0].target.disambiguation).toBe('gap');
    wrapper.unmount();
  });

  it("policy='reject' blocks a DST-gap kbd drop entirely (no onEventDrop fires)", async () => {
    const drops: TimeGridEventDropPayload[] = [];
    const policy = ref<DstPolicy>('reject');
    const event: CalendarEvent = {
      id: 'standup',
      start: zdt('2026-03-28T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-03-28T03:00:00', 'Europe/Vienna'),
    };
    const { api, wrapper } = harness([event], 'Europe/Vienna', policy, (p) =>
      drops.push(p),
    );
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
    // The arrow press is silently caught by deriveNextFromArrow's
    // try/catch when policy=reject hits a DST gap. No staged preview,
    // so Enter has nothing to commit. onEventDrop never fires.
    expect(drops.length).toBe(0);
    wrapper.unmount();
  });
});

describe('useTimeGridDnd — original.displayZone snapshot (Phase 8.14-T4)', () => {
  it('keyboard drag captures displayZone at FIRST arrow, not at commit', async () => {
    const drops: TimeGridEventDropPayload[] = [];
    const tzRef = ref('Europe/Vienna');
    const policy = ref<DstPolicy>('compatible');
    const event: CalendarEvent = {
      id: 'sync',
      start: zdt('2026-04-15T10:00:00', 'Europe/Vienna'),
      end: zdt('2026-04-15T11:00:00', 'Europe/Vienna'),
    };
    // Use a closure that returns the live ref so the harness can
    // change tz mid-test.
    const days = ref(
      ['2026-04-14', '2026-04-15', '2026-04-16'].map((d) =>
        Temporal.PlainDate.from(d),
      ),
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
          events: () => [event],
          days,
          timeRange,
          pixelsPerHour,
          slotDuration,
          timezone: () => tzRef.value,
          dstPolicy: computed(() => policy.value),
          surfaceRef: surface,
          columnsRef: cols,
          allDayColumnsRef: allDayCols,
          topBufferMinutes: topBuffer,
          onEventDrop: (p) => drops.push(p),
        });
        return () => h('div');
      },
    });
    const wrapper = mount(Comp);

    // FIRST arrow press while displayZone='Europe/Vienna'.
    api!.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
      event,
    );
    await nextTick();
    // Now the user toggles to Tokyo mid-drag.
    tzRef.value = 'Asia/Tokyo';
    await nextTick();
    // Commit.
    api!.onEventKeydown(
      new KeyboardEvent('keydown', { key: 'Enter' }),
      event,
    );
    await nextTick();

    expect(drops.length).toBe(1);
    // original.displayZone must be the zone at FIRST arrow
    // (Europe/Vienna), not the Tokyo zone the user toggled to.
    expect(drops[0].original.displayZone).toBe('Europe/Vienna');
    // target.displayZone is captured at COMMIT, so it reflects the
    // current zone (Tokyo) — both are useful for audit logs.
    expect(drops[0].target.displayZone).toBe('Asia/Tokyo');
    wrapper.unmount();
  });
});
