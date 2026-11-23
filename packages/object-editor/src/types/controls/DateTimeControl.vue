<script setup lang="ts">
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';

// JSON Schema "date-time" is RFC 3339: a date, a time and an offset, no zone name.
// The picker works in the browser's zone; the stored text keeps the offset only.
const props = withDefaults(defineProps<CoarValueControlProps<string>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>();
const zone = Temporal.Now.timeZoneId();
const value = computed({
  get: () => {
    try {
      return props.modelValue ? Temporal.Instant.from(props.modelValue).toZonedDateTimeISO(zone) : null;
    } catch {
      return null;
    }
  },
  set: (next: Temporal.ZonedDateTime | null) =>
    emit('update:modelValue', next ? next.toString({ timeZoneName: 'never', smallestUnit: 'second' }) : undefined),
});
</script>

<template>
  <CoarZonedDateTimePicker
    :id="id"
    v-model="value"
    size="s"
    appearance="inline"
    width="content"
    :time-zone="zone"
    :locale="locale"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
  />
</template>
