<script setup lang="ts">
/**
 * Typed and pasted text in the date pickers: each picker with its model as text,
 * and how often it refused an entry. `?locale=de-DE` sets the locale (default
 * en-US) and its date format, which the playground's own locale data would
 * decide otherwise; the zoned picker works in Europe/Berlin. Used by `e2e/date-input.spec.ts`.
 */
import { ref } from 'vue';
import type { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDatePicker,
  CoarPlainDateTimePicker,
  CoarZonedDateTimePicker,
  type DateFormatConfig,
} from '@cocoar/vue-ui';

const locale = new URLSearchParams(location.search).get('locale') ?? 'en-US';
const dateFormat: DateFormatConfig = locale === 'de-DE'
  ? { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 }
  : { pattern: 'mm/dd/yyyy', firstDayOfWeek: 7 };
const date = ref<Temporal.PlainDate | null>(null);
const dateTime = ref<Temporal.PlainDateTime | null>(null);
const zoned = ref<Temporal.ZonedDateTime | null>(null);
const precise = ref<Temporal.ZonedDateTime | null>(null);
const refused = ref({ date: false, dateTime: false, zoned: false, precise: false });
</script>

<template>
  <div class="page">
    <section data-testid="date">
      <CoarPlainDatePicker v-model="date" :locale="locale" :date-format="dateFormat" @entry-refused="refused.date = $event" />
      <output data-testid="value">{{ date?.toString() ?? 'none' }}</output>
      <output data-testid="refused">{{ refused.date }}</output>
    </section>
    <section data-testid="date-time">
      <CoarPlainDateTimePicker v-model="dateTime" :locale="locale" :date-format="dateFormat" @entry-refused="refused.dateTime = $event" />
      <output data-testid="value">{{ dateTime?.toString() ?? 'none' }}</output>
      <output data-testid="refused">{{ refused.dateTime }}</output>
    </section>
    <section data-testid="zoned">
      <CoarZonedDateTimePicker
        v-model="zoned"
        :locale="locale" :date-format="dateFormat"
        time-zone="Europe/Berlin"
        @entry-refused="refused.zoned = $event"
      />
      <output data-testid="value">{{ zoned?.toString() ?? 'none' }}</output>
      <output data-testid="refused">{{ refused.zoned }}</output>
    </section>
    <section data-testid="precise">
      <CoarZonedDateTimePicker
        v-model="precise"
        :locale="locale"
        :date-format="dateFormat"
        time-zone="Europe/Berlin"
        precision="millisecond"
        @entry-refused="refused.precise = $event"
      />
      <output data-testid="value">{{ precise?.toString() ?? 'none' }}</output>
      <output data-testid="refused">{{ refused.precise }}</output>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  max-width: 360px;
  padding: 24px;
}
section {
  display: grid;
  gap: 4px;
}
</style>
