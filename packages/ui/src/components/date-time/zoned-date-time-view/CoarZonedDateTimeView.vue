<script setup lang="ts">
/**
 * `CoarZonedDateTimeView` — read-only display for `Temporal.ZonedDateTime`.
 *
 * Mirrors `<CoarZonedDateTimePicker>`'s `formatValue` so a read-only display
 * and the editor's resting state look identical. Each value is rendered in
 * its own zone by default; consumers can override via `displayTimeZone` to
 * project all values into a single zone (e.g. the user's home zone).
 *
 * Output: `"<date> <time> [<zone-label>]"`. The zone label is appended only
 * when `showTimeZone` is `true` (default) AND the resolved display zone is
 * meaningful — set `showTimeZone={false}` to hide it in compact contexts.
 *
 * Same cross-realm-safe `Symbol.toStringTag` type-check as the sibling views.
 */
import { computed, toRef } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import { coarFormatPlainDate } from '../_shared/date-helpers';
import { coarFormatTime, coarDetect12HourFormat } from '../_shared/time-helpers';
import { coarFormatTimezoneLabel } from '../_shared/timezone-helpers';
import type { DateFormatConfig } from '../_shared/types';

export type CoarZonedDateTimeViewSize = 'xs' | 's' | 'm' | 'l';

export interface CoarZonedDateTimeViewProps {
  /** The ZonedDateTime value to display. `null` renders the placeholder. */
  value?: Temporal.ZonedDateTime | null;
  /** Locale override (BCP-47 tag). Defaults to consumer-app locale. */
  locale?: string;
  /** Date format override. Defaults to the resolved consumer-app format. */
  dateFormat?: DateFormatConfig;
  /**
   * 24-hour vs 12-hour clock. `true` = 24h, `false` = 12h, `'auto'`
   * (default) derives from the resolved locale.
   */
  use24Hour?: boolean | 'auto';
  /**
   * IANA zone to project the value into for display. Defaults to the value's
   * own `timeZoneId` — set this to e.g. `'Europe/Vienna'` to render every
   * row's instant in Vienna's wallclock.
   */
  displayTimeZone?: string;
  /**
   * Append the zone label (`'GMT+1'` / `'EST'` etc.) to the formatted
   * output. Default `true`.
   */
  showTimeZone?: boolean;
  /** Text shown when `value` is `null` or not a `Temporal.ZonedDateTime`. */
  placeholder?: string;
  /** Font-size token — matches the form-input family. */
  size?: CoarZonedDateTimeViewSize;
}

const props = withDefaults(defineProps<CoarZonedDateTimeViewProps>(), {
  value: null,
  locale: undefined,
  dateFormat: undefined,
  use24Hour: 'auto',
  displayTimeZone: undefined,
  showTimeZone: true,
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

function isZonedDateTime(v: unknown): v is Temporal.ZonedDateTime {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.ZonedDateTime]';
}

/**
 * Resolved display zone. Explicit prop wins; fallback is the value's own
 * `timeZoneId` so cross-zone rows each show in their own zone.
 */
const effectiveDisplayTz = computed<string | null>(() => {
  if (props.displayTimeZone) return props.displayTimeZone;
  if (isZonedDateTime(props.value)) return props.value.timeZoneId;
  return null;
});

const formatted = computed(() => {
  if (!isZonedDateTime(props.value)) return '';
  const displayTz = effectiveDisplayTz.value;
  const inDisplayTz = displayTz ? props.value.withTimeZone(displayTz) : props.value;
  const datePart = coarFormatPlainDate(
    inDisplayTz.toPlainDate(),
    pickerBase.effectiveDateFormat.value.pattern,
  );
  const timePart = coarFormatTime(inDisplayTz.hour, inDisplayTz.minute, effectiveUse24Hour.value);
  if (!props.showTimeZone || !displayTz) return `${datePart} ${timePart}`;
  // The label helper wants an Instant so it can resolve DST-aware abbreviations.
  const tzLabel = coarFormatTimezoneLabel(displayTz, inDisplayTz.toInstant());
  return `${datePart} ${timePart} ${tzLabel}`;
});

const displayText = computed(() => formatted.value || props.placeholder);
const isEmpty = computed(() => !formatted.value);
</script>

<template>
  <span
    class="coar-zoned-date-time-view"
    :class="[
      `coar-zoned-date-time-view--${size}`,
      { 'coar-zoned-date-time-view--empty': isEmpty },
    ]"
  >{{ displayText }}</span>
</template>

<style scoped>
.coar-zoned-date-time-view {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

.coar-zoned-date-time-view--xs { font-size: var(--coar-component-xs-font-size); }
.coar-zoned-date-time-view--s  { font-size: var(--coar-component-s-font-size); }
.coar-zoned-date-time-view--m  { font-size: var(--coar-component-m-font-size); }
.coar-zoned-date-time-view--l  { font-size: var(--coar-component-l-font-size); }

.coar-zoned-date-time-view--empty {
  color: var(--coar-text-neutral-tertiary, #999);
}
</style>
