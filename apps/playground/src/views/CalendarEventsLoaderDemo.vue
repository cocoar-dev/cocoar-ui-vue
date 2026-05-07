<script setup lang="ts">
/**
 * eventsLoader pattern (C5 cache-keyed-by-zone, loading state).
 *
 * Shows the loader contract: calendar calls `loader(window)` whenever
 * the visible range changes (debounced 50ms), caches per
 * `view|tz|start|end`, exposes `api.loading` for spinner UI.
 * Mutually exclusive with events().
 */

import { ref, computed } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  parseScheduledTime,
  type CalendarEvent,
  type ViewWindow,
} from '@cocoar/vue-calendar';

const fetchCount = ref(0);
const lastWindow = ref<ViewWindow | null>(null);

// Mock backend — emits Article-8 wire shape, parses to ZonedDateTime.
async function fetchEvents(window: ViewWindow): Promise<CalendarEvent[]> {
  fetchCount.value += 1;
  lastWindow.value = window;
  // Simulate latency.
  await new Promise((r) => setTimeout(r, 400));
  // In a real app this is HTTP. Here we synthesize 5 events per
  // visible week scattered through the window.
  const start = Temporal.PlainDate.from(window.start);
  const end = Temporal.PlainDate.from(window.end);
  const days = end.since(start, { largestUnit: 'days' }).days;
  const out: CalendarEvent[] = [];
  for (let i = 0; i < Math.min(days, 30); i += 2) {
    const d = start.add({ days: i });
    out.push({
      id: `mtg-${d.toString()}`,
      // Use the wire-helper so the consumer code stays Article-8 shaped.
      start: parseScheduledTime({
        local: `${d.toString()}T${10 + (i % 6)}:00:00`,
        timeZoneId: window.timezone,
      }),
      end: parseScheduledTime({
        local: `${d.toString()}T${11 + (i % 6)}:00:00`,
        timeZoneId: window.timezone,
      }),
      meta: { title: `Meeting #${i + 1}` },
    });
  }
  return out;
}

const { builder, api } = useCalendar();
builder
  .eventsLoader(fetchEvents)
  .timezone('Europe/Vienna')
  .locale('en-US')
  .view('month')
  .date(Temporal.PlainDate.from('2026-06-15'));

const loadingLabel = computed(() => (api.loading.value ? '⏳ loading…' : '✓ idle'));
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — eventsLoader</h1>
      <p>
        Loader is called per visible window, debounced 50ms, cached by
        <code>view|timezone|start|end</code>. Navigate forward/back; the
        cache hit count stays low. Switch view — fresh fetch (different cache
        key shape).
      </p>
      <div class="page__stats">
        <span><strong>Status:</strong> {{ loadingLabel }}</span>
        <span><strong>Fetches:</strong> {{ fetchCount }}</span>
        <span v-if="lastWindow"
          ><strong>Last window:</strong> {{ lastWindow.view }}
          {{ lastWindow.start }}..{{ lastWindow.end }}</span
        >
        <button @click="api.refresh()">Force refresh</button>
      </div>
    </header>
    <div class="page__calendar">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__stats { display: flex; gap: 16px; align-items: center; margin-top: 8px; font-size: 13px; }
.page__stats button { padding: 4px 10px; border: 1px solid #e5e7eb; background: white; border-radius: 4px; cursor: pointer; }
.page__calendar { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; min-height: 500px; }
</style>
