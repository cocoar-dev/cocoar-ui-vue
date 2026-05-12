<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; flex-wrap: wrap;">
      <label style="display: inline-flex; gap: 4px; align-items: center;">
        DST policy:
        <select v-model="dstPolicyValue" style="padding: 2px 6px;">
          <option value="compatible">compatible</option>
          <option value="reject">reject</option>
          <option value="earlier">earlier</option>
          <option value="later">later</option>
        </select>
      </label>
      <CoarButton variant="secondary" size="s" @click="addExtraSeries">
        + Add series
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="resetSeries">
        Reset
      </CoarButton>
      <span style="color: var(--coar-text-neutral-secondary);">
        Visible: {{ visibleCount }} (recurring: {{ recurringCount }})
      </span>
    </div>
    <div
      style="height: 480px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;"
    >
      <CoarCalendar :builder="builder" />
    </div>
    <div
      v-if="lastClick"
      style="font-family: monospace; font-size: 11px; color: var(--coar-text-neutral-secondary);"
    >
      {{ lastClick }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Recurrence demo.
 *
 * `builder.series([...])` for in-memory recurring series. Reactive —
 * mutating the source ref re-expands. Composes with one-off events
 * via `builder.events([...])`. `dstPolicy` applied uniformly to
 * every occurrence via the post-processing layer; engine swap never
 * changes observable semantics. Click an event to read its
 * `__recurrence` provenance.
 */

import { computed, ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
  type DstPolicy,
  type RecurringSeries,
} from '@cocoar/vue-calendar';
import { getRecurrenceMeta } from '@cocoar/vue-calendar/recurrence';

const view = ref<CalendarView>('month');
const cursor = ref(Temporal.PlainDate.from('2026-06-15'));
const dstPolicyValue = ref<DstPolicy>('compatible');
const lastClick = ref<string>('');

const standup: RecurringSeries = {
  id: 'standup',
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-01T09:00:00[Europe/Vienna]',
  ),
  duration: { minutes: 30 },
  meta: { title: 'Standup', color: '#4f46e5' },
};
const sprintReview: RecurringSeries = {
  id: 'sprint-review',
  rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-05T15:00:00[Europe/Vienna]',
  ),
  duration: { hours: 1 },
  meta: { title: 'Sprint Review', color: '#06b6d4' },
};
const oneOff: CalendarEvent = {
  id: 'kickoff',
  start: Temporal.ZonedDateTime.from('2026-06-08T11:00:00[Europe/Vienna]'),
  end: Temporal.ZonedDateTime.from('2026-06-08T12:30:00[Europe/Vienna]'),
  meta: { title: 'Project Kickoff', color: '#f59e0b' },
};

const seriesSource = ref<RecurringSeries[]>([standup, sprintReview]);

const { builder, api } = useCalendar();
builder
  .view(view)
  .date(cursor)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .events([oneOff])
  .series(seriesSource)
  .dstPolicy(dstPolicyValue)
  .onEventClick(({ event }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    const meta = getRecurrenceMeta(event);
    lastClick.value = meta
      ? `${title} — series=${meta.seriesId}, source=${meta.source}, recurrenceId=${meta.recurrenceId.toString()}`
      : `${title} (one-off)`;
  });

function addExtraSeries() {
  const id = `extra-${seriesSource.value.length}`;
  seriesSource.value = [
    ...seriesSource.value,
    {
      id,
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-10T13:00:00[Europe/Vienna]',
      ),
      duration: { minutes: 45 },
      meta: { title: `Extra ${id}`, color: '#ec4899' },
    },
  ];
}

function resetSeries() {
  seriesSource.value = [standup, sprintReview];
  lastClick.value = '';
}

const visibleCount = computed(() => api.getVisibleEvents().length);
const recurringCount = computed(
  () =>
    api.getVisibleEvents().filter((e) => getRecurrenceMeta(e) !== null).length,
);
</script>
