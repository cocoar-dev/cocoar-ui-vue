<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Zoned date-time picker: the display time zone list opened inside the panel. stories.json fixes the clock
 * to 2026-03-10, so "today" is in the visible month; the panel's side column holds the
 * month list and the year stepper.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
import { pickerDateFormat } from './compact-interaction-data';

const value = ref(Temporal.ZonedDateTime.from('2026-03-14T10:30:00+01:00[Europe/Vienna]'));
const min = Temporal.ZonedDateTime.from('2026-03-04T00:00:00+01:00[Europe/Vienna]');
</script>

<template>
  <div class="coar-compact" data-interaction="zoned-zone-list">
    <section class="vs-section">
      <h2 class="vs-title">Zoned date-time picker: the display time zone list opened inside the panel</h2>
      <div style="width: 280px" data-visual-open>
        <CoarZonedDateTimePicker
          v-model="value"
          :min="min"
          :date-format="pickerDateFormat"
          locale="en-US"
          time-zone="Europe/Vienna"
          :use24-hour="true"
        />
      </div>
    </section>
  </div>
</template>
