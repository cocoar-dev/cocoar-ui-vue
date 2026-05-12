<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
        Each row's value lives in its own zone — the view renders each in its own zone by default:
      </div>
      <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 16px; font-size: 14px;">
        <span style="color: #64748b;">EU sync</span>
        <CoarZonedDateTimeView :value="eu" />
        <span style="color: #64748b;">US sync</span>
        <CoarZonedDateTimeView :value="us" />
        <span style="color: #64748b;">AP sync</span>
        <CoarZonedDateTimeView :value="ap" />
      </div>
    </div>
    <div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 13px; color: #64748b;">…or project everything into one zone via <code>displayTimeZone</code>:</span>
        <CoarSegmentedControl v-model="projectInto" :options="zones" size="s" />
      </div>
      <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 16px; font-size: 14px;">
        <span style="color: #64748b;">EU sync</span>
        <CoarZonedDateTimeView :value="eu" :display-time-zone="projectInto" />
        <span style="color: #64748b;">US sync</span>
        <CoarZonedDateTimeView :value="us" :display-time-zone="projectInto" />
        <span style="color: #64748b;">AP sync</span>
        <CoarZonedDateTimeView :value="ap" :display-time-zone="projectInto" />
      </div>
    </div>
    <div style="font-size: 12px; color: #64748b;">
      All three values point at the same wallclock-in-its-own-zone (10:00 / 15:00 / 09:00), but the underlying instants differ. Projecting into one zone shows the comparable wallclock for that observer.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimeView, CoarSegmentedControl } from '@cocoar/vue-ui';

const eu = Temporal.ZonedDateTime.from('2026-05-13T10:00:00[Europe/Vienna]');
const us = Temporal.ZonedDateTime.from('2026-05-13T15:00:00[America/New_York]');
const ap = Temporal.ZonedDateTime.from('2026-05-14T09:00:00[Asia/Tokyo]');

const projectInto = ref('Europe/Vienna');
const zones = [
  { value: 'Europe/Vienna',    label: 'Vienna' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Asia/Tokyo',       label: 'Tokyo' },
];
</script>
