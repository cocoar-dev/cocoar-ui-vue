<script setup lang="ts">
/**
 * Mount cost of the continuous month view with a realistic data set —
 * the amZettel report: ~300 events over two years, 39 of them series,
 * Details density. "Mount" times the synchronous setup + render and the
 * first painted frame; `apps/playground/scripts/month-perf.mjs` drives it
 * headless with CPU throttling.
 */

import { nextTick, ref, shallowRef } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type RecurringSeries,
} from '@cocoar/vue-calendar';

const ZONE = 'Europe/Vienna';
const CENTER = Temporal.PlainDate.from('2026-06-15');

/** Deterministic PRNG so every run measures the same data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

function buildData(singleCount: number, seriesCount: number) {
  const rnd = mulberry32(42);
  const events: CalendarEvent[] = [];
  for (let i = 0; i < singleCount; i++) {
    const day = CENTER.subtract({ days: 365 }).add({ days: Math.floor(rnd() * 730) });
    const color = COLORS[i % COLORS.length];
    if (rnd() < 0.12) {
      events.push({
        id: `ad${i}`,
        start: day,
        end: day.add({ days: 1 + Math.floor(rnd() * 4) }),
        meta: { title: `All-day ${i}`, color },
      });
    } else {
      const start = Temporal.ZonedDateTime.from({
        timeZone: ZONE,
        year: day.year,
        month: day.month,
        day: day.day,
        hour: 7 + Math.floor(rnd() * 11),
        minute: rnd() < 0.5 ? 0 : 30,
      });
      events.push({
        id: `e${i}`,
        start,
        end: start.add({ minutes: 30 + Math.floor(rnd() * 4) * 30 }),
        meta: { title: `Termin ${i}`, color },
      });
    }
  }
  const rules = ['FREQ=WEEKLY;BYDAY=MO', 'FREQ=WEEKLY;BYDAY=TU,TH', 'FREQ=MONTHLY;BYMONTHDAY=1'];
  const series: RecurringSeries[] = Array.from({ length: seriesCount }, (_, i) => {
    const day = CENTER.subtract({ days: 365 }).add({ days: Math.floor(rnd() * 400) });
    return {
      id: `s${i}`,
      rrule: rules[i % rules.length] + (i % 2 ? ';COUNT=20' : ''),
      dtstart: Temporal.ZonedDateTime.from({
        timeZone: ZONE,
        year: day.year,
        month: day.month,
        day: day.day,
        hour: 8 + (i % 9),
      }),
      duration: { minutes: 45 },
      meta: { title: `Serie ${i}`, color: COLORS[i % COLORS.length] },
    };
  });
  return { events, series };
}

const params = new URLSearchParams(window.location.search);
const data = buildData(Number(params.get('events') ?? 255), Number(params.get('series') ?? 39));
const events = shallowRef(data.events);
const series = shallowRef(data.series);

const { builder } = useCalendar();
builder
  .events(events)
  .series(series)
  .timezone(ZONE)
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('month')
  .monthDensity('details')
  .date(CENTER);

const shown = ref(false);
const result = ref('');
const longTasks: number[] = [];
if (typeof PerformanceObserver !== 'undefined') {
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration));
    }).observe({ type: 'longtask', buffered: false });
  } catch {
    // longtask is Chromium-only
  }
}

async function mount() {
  shown.value = false;
  await nextTick();
  await new Promise((r) => setTimeout(r, 50));
  longTasks.length = 0;
  const t0 = performance.now();
  shown.value = true;
  await nextTick();
  const t1 = performance.now();
  // First frame after the mount: rAF, then a task after it has painted.
  await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const t2 = performance.now();
  // Let deferred work (idle-time rendering) finish before reporting long tasks.
  await new Promise((r) => setTimeout(r, 1500));
  const sections = document.querySelectorAll('.coar-continuous-month-view__section').length;
  const pills = document.querySelectorAll('.coar-month-pill').length;
  result.value = JSON.stringify({
    mountMs: Math.round(t1 - t0),
    firstFrameMs: Math.round(t2 - t0),
    longTasks: [...longTasks],
    sections,
    pills,
  });
}
</script>

<template>
  <div class="perf">
    <div class="perf__bar">
      <button data-testid="perf-mount" @click="mount">Mount</button>
      <code data-testid="perf-result">{{ result }}</code>
    </div>
    <div class="perf__calendar">
      <CoarCalendar v-if="shown" :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.perf {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  gap: 8px;
}
.perf__bar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.perf__calendar {
  flex: 1;
  min-height: 0;
  max-width: 420px;
  border: 1px solid #ddd;
}
</style>
