<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Plain date-time picker open: day, time section, month list. stories.json fixes the clock
 * to 2026-03-10, so "today" is in the visible month; the panel's side column holds the
 * month list and the year stepper.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import { pickerDateFormat } from './compact-interaction-data';

const value = ref(Temporal.PlainDateTime.from('2026-03-14T10:30'));
const min = Temporal.PlainDateTime.from('2026-03-04T00:00');
</script>

<template>
  <div class="coar-compact" data-interaction="plain-date-time">
    <section class="vs-section">
      <h2 class="vs-title">Plain date-time picker open: day, time section, month list</h2>
      <div style="width: 280px" data-visual-open>
        <CoarPlainDateTimePicker
          v-model="value"
          :min="min"
          :date-format="pickerDateFormat"
          locale="en-US"
          :use24-hour="true"
        />
      </div>
    </section>
  </div>
</template>
