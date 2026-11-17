<script setup lang="ts">
import './compact-fonts';
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDatePicker,
  CoarPlainDateTimeOrDatePicker,
  CoarZonedDateTimeOrDatePicker,
} from '@cocoar/vue-ui';

const plain = ref<Temporal.PlainDate | Temporal.PlainDateTime | null>(Temporal.PlainDate.from('2026-03-14'));
const zoned = ref<Temporal.PlainDate | Temporal.ZonedDateTime | null>(Temporal.PlainDate.from('2026-03-14'));
const selected = ref(Temporal.PlainDate.from('2026-03-14'));
const markers = [{
  startDate: Temporal.PlainDate.from('2026-03-13'),
  endDate: Temporal.PlainDate.from('2026-03-15'),
  description: 'Mehrere Tage: Planung und Abstimmung',
}];
const lower = Temporal.PlainDate.from('1926-03-14');
const upper = Temporal.PlainDate.from('2076-03-14');
</script>

<template>
  <div class="coar-compact" data-edge="dates">
    <section class="vs-section">
      <h2 class="vs-title">Optional time: both real composed pickers</h2>
      <div class="vs-row">
        <div data-case="plain" style="width: 320px">
          <CoarPlainDateTimeOrDatePicker v-model="plain" locale="en-US" />
        </div>
        <div data-case="zoned" style="width: 320px">
          <CoarZonedDateTimeOrDatePicker v-model="zoned" locale="en-US" time-zone="Europe/Vienna" />
        </div>
      </div>
    </section>
    <section class="vs-section">
      <h2 class="vs-title">Selected date markers and the actual year-stepper bounds</h2>
      <div class="vs-row">
        <div data-case="markers" style="width: 280px">
          <CoarPlainDatePicker v-model="selected" :markers="markers" locale="en-US" show-week-numbers />
        </div>
        <div data-case="lower" style="width: 220px">
          <CoarPlainDatePicker :model-value="lower" locale="en-US" />
        </div>
        <div data-case="upper" style="width: 220px">
          <CoarPlainDatePicker :model-value="upper" locale="en-US" />
        </div>
      </div>
    </section>
  </div>
</template>
