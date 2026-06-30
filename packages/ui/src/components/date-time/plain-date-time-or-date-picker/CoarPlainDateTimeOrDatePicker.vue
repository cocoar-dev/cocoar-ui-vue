<script setup lang="ts">
/**
 * A date picker whose **time is optional**: a clock toggle beside the field
 * switches between entering just a date (`Temporal.PlainDate`) and a date with
 * a (zone-less) time (`Temporal.PlainDateTime`). It composes the existing
 * `CoarPlainDatePicker` / `CoarPlainDateTimePicker` — no reimplementation — and
 * the toggle lives **outside** the input, visually separated.
 *
 * `v-model` carries the union value; `v-model:withTime` is the toggle (also kept
 * in sync with a non-null value's type). Read the result type directly
 * (`value instanceof Temporal.PlainDateTime` vs `Temporal.PlainDate`).
 */
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import CoarButton from '../../button/CoarButton.vue';
import { vTooltip } from '../../tooltip/vTooltip';
import CoarPlainDatePicker from '../plain-date-picker/CoarPlainDatePicker.vue';
import CoarPlainDateTimePicker from '../plain-date-time-picker/CoarPlainDateTimePicker.vue';
import { useDateOrTime } from '../_shared/use-date-or-time';
import '../_shared/date-or-time.css';

export type CoarPlainDateTimeOrDatePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    size?: CoarPlainDateTimeOrDatePickerSize;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    error?: boolean;
    clearable?: boolean;
    locale?: string;
    /** Min/max are given as the with-time type; the date mode uses their date part. */
    min?: Temporal.PlainDateTime | null;
    max?: Temporal.PlainDateTime | null;
    minuteStep?: 1 | 5 | 10 | 15;
    /** Clock toggle side, relative to the input. */
    togglePosition?: 'start' | 'end';
    /** Tooltip + accessible label for the toggle while time is OFF (adds time). */
    addTimeLabel?: string;
    /** Tooltip + accessible label for the toggle while time is ON (removes time). */
    removeTimeLabel?: string;
  }>(),
  {
    placeholder: '',
    size: 'm',
    disabled: false,
    readonly: false,
    required: false,
    error: false,
    clearable: false,
    locale: undefined,
    min: null,
    max: null,
    minuteStep: 5,
    togglePosition: 'start',
    addTimeLabel: 'Add time',
    removeTimeLabel: 'Remove time',
  },
);

const emit = defineEmits<{ opened: []; closed: [] }>();

const modelValue = defineModel<Temporal.PlainDateTime | Temporal.PlainDate | null>({ default: null });
const withTime = defineModel<boolean>('withTime', { default: false });

function defaultPlainTime(): Temporal.PlainTime {
  return Temporal.Now.plainTimeISO().round({
    smallestUnit: 'minute',
    roundingIncrement: props.minuteStep,
    roundingMode: 'halfExpand',
  });
}

const { dateValue, dateTimeValue, setDate, setDateTime, toggle } = useDateOrTime<Temporal.PlainDateTime>(
  modelValue,
  withTime,
  {
    isDateTime: (v): v is Temporal.PlainDateTime => v instanceof Temporal.PlainDateTime,
    toDateTime: (date) => date.toPlainDateTime(defaultPlainTime()),
    toDate: (dateTime) => dateTime.toPlainDate(),
  },
);

const minDate = computed(() => props.min?.toPlainDate() ?? null);
const maxDate = computed(() => props.max?.toPlainDate() ?? null);

const toggleLabel = computed(() => (withTime.value ? props.removeTimeLabel : props.addTimeLabel));
</script>

<template>
  <div
    class="coar-date-or-time"
    :class="[`coar-date-or-time--${size}`, { 'coar-date-or-time--toggle-end': togglePosition === 'end' }]"
  >
    <CoarButton
      v-tooltip="toggleLabel"
      class="coar-date-or-time__toggle"
      :class="{ 'coar-date-or-time__toggle--active': withTime }"
      variant="ghost"
      :size="size"
      :icon-start="withTime ? 'clock' : 'clock-off'"
      :disabled="disabled || readonly"
      :aria-pressed="withTime"
      :aria-label="toggleLabel"
      @click="toggle"
    />

    <CoarPlainDateTimePicker
      v-if="withTime"
      class="coar-date-or-time__input"
      :model-value="dateTimeValue"
      :placeholder="placeholder"
      :size="size"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :error="error"
      :clearable="clearable"
      :locale="locale"
      :min="min"
      :max="max"
      :minute-step="minuteStep"
      @update:model-value="setDateTime"
      @opened="emit('opened')"
      @closed="emit('closed')"
    />
    <CoarPlainDatePicker
      v-else
      class="coar-date-or-time__input"
      :model-value="dateValue"
      :placeholder="placeholder"
      :size="size"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :error="error"
      :clearable="clearable"
      :locale="locale"
      :min="minDate"
      :max="maxDate"
      @update:model-value="setDate"
      @opened="emit('opened')"
      @closed="emit('closed')"
    />
  </div>
</template>
