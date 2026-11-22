<script setup lang="ts">
/**
 * The small month (`<CoarMiniMonth>`): with a selected day and its week,
 * today, the neighbouring months' days, without a selection, and with a
 * mark from the `#day` slot.
 */
import { ref } from 'vue';
import { CoarMiniMonth, Temporal } from '@cocoar/vue-calendar';

const selected = ref(Temporal.PlainDate.from('2026-11-26'));
const marked = ref(Temporal.PlainDate.from('2026-11-05'));
</script>

<template>
  <div style="display: flex; gap: 32px; align-items: flex-start">
    <CoarMiniMonth v-model="selected" locale="en-GB" :first-day-of-week="1" timezone="Europe/Vienna" />
    <CoarMiniMonth locale="en-GB" :first-day-of-week="1" timezone="Europe/Vienna" />
    <CoarMiniMonth v-model="marked" locale="en-GB" :first-day-of-week="1" timezone="Europe/Vienna" :highlight-week="false">
      <template #day="{ date }">
        {{ date.day }}<sup v-if="date.day % 7 === 0">•</sup>
      </template>
    </CoarMiniMonth>
  </div>
</template>
