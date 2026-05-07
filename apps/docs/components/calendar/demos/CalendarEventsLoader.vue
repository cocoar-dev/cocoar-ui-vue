<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; font-size: 13px;">
      <span :class="['loader-pill', { 'loader-pill--active': loading }]">
        {{ loading ? 'Loading…' : 'Idle' }}
      </span>
      <CoarButton variant="secondary" size="s" @click="api.refresh()">
        Refresh
      </CoarButton>
      <span style="color: var(--coar-text-neutral-secondary);">
        Fetch count: {{ fetchCount }} (rapid prev/next coalesces into one fetch)
      </span>
    </div>
    <div style="height: 480px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Loader demo.
 *
 * `builder.eventsLoader(window => fetch(window))` lets the calendar
 * pull events for the visible window only. Rapid view-nav debounces
 * into a single fetch; results are cached per-window so revisiting
 * a previously-loaded window is instant. `api.loading` toggles
 * around the in-flight promise; `api.refresh()` invalidates the
 * cache and refetches.
 *
 * The mock loader below sleeps for 300 ms then returns synthesised
 * events for the window, so the loading state is observable.
 *
 * Returned events use the article-4 typed shape — `ZonedDateTime`
 * for timed entries (and `PlainDate` for all-day, if any).
 */

import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const fetchCount = ref(0);

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

async function fakeBackendLoad(start: string, end: string): Promise<CalendarEvent[]> {
  await sleep(300);
  // Walk the date range using Temporal — `PlainDate.add({days:1})` is
  // calendar-correct (no DST drift, no UTC tax). The lib's article
  // series exists to kill `new Date() + 86_400_000` math; the demos
  // shouldn't teach it.
  const out: CalendarEvent[] = [];
  let cursor = Temporal.PlainDate.from(start);
  const stop = Temporal.PlainDate.from(end);
  while (Temporal.PlainDate.compare(cursor, stop) < 0) {
    // Temporal: dayOfWeek 1=Mon … 7=Sun. Mon-Fri = 1..5.
    if (cursor.dayOfWeek >= 1 && cursor.dayOfWeek <= 5) {
      const iso = cursor.toString();
      out.push({
        id: `loaded-${iso}`,
        start: zdt(`${iso}T11:00:00`),
        end: zdt(`${iso}T12:00:00`),
        meta: { title: `Loaded for ${iso}`, color: '#7c3aed' },
      });
    }
    cursor = cursor.add({ days: 1 });
  }
  return out;
}

const { builder, api } = useCalendar();
builder
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .eventsLoader(async (window) => {
    fetchCount.value++;
    return fakeBackendLoad(window.start, window.end);
  });

const loading = api.loading;
</script>

<style scoped>
.loader-pill {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-secondary);
  font-variant-numeric: tabular-nums;
}
.loader-pill--active {
  background: var(--coar-color-accent, #2563eb);
  color: #fff;
}
</style>
