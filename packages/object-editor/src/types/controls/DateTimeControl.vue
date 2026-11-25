<script setup lang="ts">
import { computed, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useI18n } from '@cocoar/vue-localization';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';
import { useRefusal } from './useRefusal';

// JSON Schema "date-time" is RFC 3339: a date, a time and an offset, no zone name.
// A value keeps its own offset and its precision: the picker shows it in the
// browser's zone, and a change is written with the offset the value had. A new
// value gets the browser zone's offset.
const props = withDefaults(defineProps<CoarValueControlProps<string>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined]; refused: [message: string | undefined] }>();
const { t } = useI18n();
const refused = ref(false);
useRefusal(
  emit,
  computed(() => (refused.value ? t('coar.objectEditor.invalidDateTime', undefined, 'Not a date and time: the value is unchanged. Esc restores it.') : undefined)),
);
const zone = Temporal.Now.timeZoneId();

/** `…Z` as UTC, `…+05:00` as the fixed offset +05:00. */
function parse(text: string | undefined): Temporal.ZonedDateTime | null {
  if (!text) return null;
  try {
    const offset = text.match(/([+-]\d{2}:\d{2})$/)?.[1];
    return Temporal.Instant.from(text).toZonedDateTimeISO(offset ?? 'UTC');
  } catch {
    return null;
  }
}

const value = computed({
  get: () => parse(props.modelValue),
  set: (next: Temporal.ZonedDateTime | null) => {
    if (!next) {
      emit('update:modelValue', undefined);
      return;
    }
    const current = value.value;
    if (current && next.equals(current)) return;
    emit('update:modelValue', next.timeZoneId === 'UTC' ? next.toInstant().toString() : next.toString({ timeZoneName: 'never' }));
  },
});
// RFC 3339 always has seconds; a value with a fraction shows milliseconds.
const precision = computed(() => {
  const current = value.value;
  return current && (current.millisecond || current.microsecond || current.nanosecond) ? 'millisecond' : 'second';
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
    :precision="precision"
    :locale="locale"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    @entry-refused="refused = $event"
  />
</template>
