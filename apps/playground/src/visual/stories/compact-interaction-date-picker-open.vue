<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Plain date picker open: selected day, today, days before min disabled, month list. stories.json fixes the clock
 * to 2026-03-10, so "today" is in the visible month; the panel's side column holds the
 * month list and the year stepper.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import { pickerDateFormat } from './compact-interaction-data';

const value = ref(Temporal.PlainDate.from('2026-03-14'));
const min = Temporal.PlainDate.from('2026-03-04');
</script>

<template>
  <div class="coar-compact" data-interaction="plain-date">
    <section class="vs-section">
      <h2 class="vs-title">Plain date picker open: selected day, today, days before min disabled, month list</h2>
      <div style="width: 280px" data-visual-open>
        <CoarPlainDatePicker
          v-model="value"
          :min="min"
          :date-format="pickerDateFormat"
          locale="en-US"
        />
      </div>
    </section>
  </div>
</template>
