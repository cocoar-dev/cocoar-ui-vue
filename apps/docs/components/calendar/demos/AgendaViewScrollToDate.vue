<template>
  <div>
    <div class="controls">
      <CoarButton size="sm" @click="api.scrollToDate('2026-04-13')">
        ← DevConf (Apr 13)
      </CoarButton>
      <CoarButton size="sm" @click="api.scrollToDate('2026-04-22')">
        Team offsite (Apr 22)
      </CoarButton>
      <CoarButton size="sm" @click="api.scrollToDate('2026-05-04')">
        Quarterly review (May 4) →
      </CoarButton>
      <label class="toggle">
        <input v-model="empty" type="checkbox" />
        <span>Show empty days</span>
      </label>
    </div>
    <div style="height: 460px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarAgendaView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarAgendaView,
  useAgendaView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-01'));
const empty = ref(false);

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'team-offsite',
    start: pd('2026-04-22'),
    end: pd('2026-04-25'),
    meta: { title: 'Team offsite', color: '#0891b2' },
  },
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17',
      '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Daily standup', color: '#10b981' },
    }),
  ),
  {
    id: 'qr',
    start: zdt('2026-05-04T10:00:00'),
    end: zdt('2026-05-04T12:00:00'),
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
]);

const { builder, api } = useAgendaView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .agendaLengthDays(60)
  .showEmptyDays(() => empty.value);
</script>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 13px;
  color: var(--coar-text-subtle, #6b7280);
}
</style>
