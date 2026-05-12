<script setup lang="ts">
/**
 * `CoarPlainDateTimeView` — read-only display for `Temporal.PlainDateTime`
 * (floating wallclock, no zone).
 *
 * Mirrors `<CoarPlainDateTimePicker>`'s `formatValue` so a read-only display
 * and the editor's resting state look identical: locale-resolved date format
 * + locale-derived 12h/24h time format (overridable via `use24Hour`).
 *
 * Same cross-realm-safe `Symbol.toStringTag` type-check as the sibling views.
 */
import { computed, toRef } from 'vue';
import type { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import { coarFormatPlainDate } from '../_shared/date-helpers';
import { coarFormatTime, coarDetect12HourFormat } from '../_shared/time-helpers';
import type { DateFormatConfig } from '../_shared/types';

export type CoarPlainDateTimeViewSize = 'xs' | 's' | 'm' | 'l';

export interface CoarPlainDateTimeViewProps {
  /** The PlainDateTime value to display. `null` renders the placeholder. */
  value?: Temporal.PlainDateTime | null;
  /** Locale override (BCP-47 tag). Defaults to consumer-app locale. */
  locale?: string;
  /** Date format override. Defaults to the resolved consumer-app format. */
  dateFormat?: DateFormatConfig;
  /**
   * 24-hour vs 12-hour clock. `true` = 24h, `false` = 12h, `'auto'`
   * (default) derives from the resolved locale.
   */
  use24Hour?: boolean | 'auto';
  /** Text shown when `value` is `null` or not a `Temporal.PlainDateTime`. */
  placeholder?: string;
  /** Font-size token — matches the form-input family. */
  size?: CoarPlainDateTimeViewSize;
}

const props = withDefaults(defineProps<CoarPlainDateTimeViewProps>(), {
  value: null,
  locale: undefined,
  dateFormat: undefined,
  use24Hour: 'auto',
  placeholder: '',
  size: 'm',
});

const pickerBase = useDatePickerBase({
  locale: toRef(props, 'locale'),
  dateFormat: toRef(props, 'dateFormat'),
});

const effectiveUse24Hour = computed(() => {
  if (props.use24Hour === true) return true;
  if (props.use24Hour === false) return false;
  return !coarDetect12HourFormat(pickerBase.effectiveLocale.value);
});

function isPlainDateTime(v: unknown): v is Temporal.PlainDateTime {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.PlainDateTime]';
}

const formatted = computed(() => {
  if (!isPlainDateTime(props.value)) return '';
  const datePart = coarFormatPlainDate(
    props.value.toPlainDate(),
    pickerBase.effectiveDateFormat.value.pattern,
  );
  const timePart = coarFormatTime(props.value.hour, props.value.minute, effectiveUse24Hour.value);
  return `${datePart} ${timePart}`;
});

const displayText = computed(() => formatted.value || props.placeholder);
const isEmpty = computed(() => !formatted.value);
</script>

<template>
  <span
    class="coar-plain-date-time-view"
    :class="[
      `coar-plain-date-time-view--${size}`,
      { 'coar-plain-date-time-view--empty': isEmpty },
    ]"
  >{{ displayText }}</span>
</template>

<style scoped>
.coar-plain-date-time-view {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

.coar-plain-date-time-view--xs { font-size: var(--coar-component-xs-font-size); }
.coar-plain-date-time-view--s  { font-size: var(--coar-component-s-font-size); }
.coar-plain-date-time-view--m  { font-size: var(--coar-component-m-font-size); }
.coar-plain-date-time-view--l  { font-size: var(--coar-component-l-font-size); }

.coar-plain-date-time-view--empty {
  color: var(--coar-text-neutral-tertiary, #999);
}
</style>
