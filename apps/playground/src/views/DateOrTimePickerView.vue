<script setup lang="ts">
/**
 * Demo for the "date, optionally with time" pickers: a clock toggle beside the
 * field switches between a plain date and a date-with-time. One v-model carries
 * the union value; v-model:withTime is the toggle.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDateTimeOrDatePicker,
  CoarZonedDateTimeOrDatePicker,
} from '@cocoar/vue-ui';

const zoned = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(null);
const zonedWithTime = ref(false);

const plain = ref<Temporal.PlainDateTime | Temporal.PlainDate | null>(null);
const plainWithTime = ref(false);

// Start one pre-filled with a date to show toggle conversion on an existing value.
const prefilled = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(
  Temporal.PlainDate.from('2026-07-01'),
);
const prefilledWithTime = ref(false);

function describe(value: Temporal.ZonedDateTime | Temporal.PlainDateTime | Temporal.PlainDate | null): string {
  if (value == null) return 'null';
  return `${value.constructor.name} · ${value.toString()}`;
}
</script>

<template>
  <div class="dotp">
    <h2 class="dotp__title">Date · optional time <small>(clock toggle beside the field)</small></h2>

    <section class="dotp__row">
      <div class="dotp__label">CoarZonedDateTimeOrDatePicker</div>
      <CoarZonedDateTimeOrDatePicker v-model="zoned" v-model:with-time="zonedWithTime" clearable />
      <code class="dotp__out">withTime={{ zonedWithTime }} → {{ describe(zoned) }}</code>
    </section>

    <section class="dotp__row">
      <div class="dotp__label">CoarPlainDateTimeOrDatePicker</div>
      <CoarPlainDateTimeOrDatePicker v-model="plain" v-model:with-time="plainWithTime" clearable />
      <code class="dotp__out">withTime={{ plainWithTime }} → {{ describe(plain) }}</code>
    </section>

    <section class="dotp__row">
      <div class="dotp__label">Pre-filled date · toggle right</div>
      <CoarZonedDateTimeOrDatePicker
        v-model="prefilled"
        v-model:with-time="prefilledWithTime"
        toggle-position="end"
        clearable
      />
      <code class="dotp__out">withTime={{ prefilledWithTime }} → {{ describe(prefilled) }}</code>
    </section>

    <section class="dotp__row">
      <div class="dotp__label">Sizes</div>
      <div class="dotp__sizes">
        <CoarZonedDateTimeOrDatePicker v-model="zoned" v-model:with-time="zonedWithTime" size="xs" />
        <CoarZonedDateTimeOrDatePicker v-model="zoned" v-model:with-time="zonedWithTime" size="s" />
        <CoarZonedDateTimeOrDatePicker v-model="zoned" v-model:with-time="zonedWithTime" size="l" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.dotp {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  max-width: 900px;
}
.dotp__title {
  margin: 0;
  font-size: 18px;
}
.dotp__title small {
  font-weight: 400;
  color: var(--coar-text-neutral-tertiary, #999);
  font-size: 13px;
}
.dotp__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dotp__label {
  font-size: 13px;
  font-weight: 600;
}
.dotp__out {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #555);
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  padding: 6px 8px;
  border-radius: 6px;
  width: fit-content;
}
.dotp__sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
</style>
