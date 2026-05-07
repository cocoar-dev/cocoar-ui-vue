<script setup lang="ts">
/**
 * Standalone sub-view demo.
 *
 * Each sub-view (CoarMonthView / CoarDayView / etc.) works without
 * the CoarCalendar shell. Pin's the "useViewWindow lives in each
 * sub-view" decision (Audit Session 3 fix #2): standalone use
 * computes the visible window and fires the loader correctly.
 *
 * Also pins the convenience composable: useDayView() wraps useCalendar()
 * with view + availableViews pre-locked.
 */

import { ref } from 'vue';
import {
  CoarDayView,
  CoarMonthView,
  CoarAgendaView,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'mtg',
    start: Temporal.ZonedDateTime.from('2026-06-15T10:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-15T11:00:00[Europe/Vienna]'),
    meta: { title: 'Meeting' },
  },
  {
    id: 'all-day',
    start: Temporal.PlainDate.from('2026-06-17'),
    end: Temporal.PlainDate.from('2026-06-19'),
    meta: { title: 'Workshop (3 days)' },
  },
]);

// Three independent builders, each driving one sub-view standalone.
// Each will mount useViewWindow internally on first render — no
// CoarCalendar shell needed.
const day = useCalendar();
day.builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('en-US')
  .date(Temporal.PlainDate.from('2026-06-15'));

const month = useCalendar();
month.builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('en-US')
  .firstDayOfWeek(1)
  .date(Temporal.PlainDate.from('2026-06-15'));

const agenda = useCalendar();
agenda.builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('en-US')
  .agendaLengthDays(14)
  .date(Temporal.PlainDate.from('2026-06-15'));
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — Standalone sub-views</h1>
      <p>
        Each sub-view works without the <code>&lt;CoarCalendar&gt;</code>
        shell — useful when you want a single fixed view (sidebar,
        widget, embedded display). Mount the sub-view directly with
        a builder; the sub-view sets the view internally.
      </p>
    </header>
    <div class="page__grid">
      <section>
        <h3>CoarDayView</h3>
        <div class="frame frame--day">
          <CoarDayView :builder="day.builder" />
        </div>
      </section>
      <section>
        <h3>CoarMonthView</h3>
        <div class="frame frame--month">
          <CoarMonthView :builder="month.builder" />
        </div>
      </section>
      <section>
        <h3>CoarAgendaView</h3>
        <div class="frame frame--agenda">
          <CoarAgendaView :builder="agenda.builder" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 16px; flex: 1; min-height: 700px; }
.page__grid section { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.page__grid h3 { margin: 0; font-size: 13px; }
.frame { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; min-height: 0; }
.frame--day { height: 100%; }
.frame--month { grid-column: 2; grid-row: 1 / span 2; height: 100%; }
.frame--agenda { height: 100%; overflow: auto; }
</style>
