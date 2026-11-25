import { computed, ref, watch, type Ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from './use-date-picker-base';
import { coarFormatPlainDate, coarParsePlainDateFromInput } from './date-helpers';
import {
  coarFormatTime,
  coarParseTimeInput,
  coarDetect12HourFormat,
  coarRoundMinutesToStep,
  coarTimeBelowMinute,
  coarTimeTextHasPrecision,
} from './time-helpers';
import type { DateFormatConfig, CoarTimePrecision, CoarTimeValue } from './types';

interface PlainDateTimePickerOptions {
  readonly placeholder: string;
  readonly locale?: string;
  readonly dateFormat?: DateFormatConfig;
  readonly min: Temporal.PlainDateTime | null;
  readonly max: Temporal.PlainDateTime | null;
  readonly use24Hour: boolean | 'auto';
  readonly minuteStep: 1 | 5 | 10 | 15;
  readonly defaultTime: CoarTimeValue;
  /** How exactly the field shows and takes the time; defaults to `'minute'`. */
  readonly precision?: CoarTimePrecision;
}

/**
 * Internal value logic shared by presentations of the plain date-time picker.
 * Pass reactive props (or getters) so options remain live. DOM, masking and overlay
 * lifecycle belong to the presentation, not this composable.
 */
export function usePlainDateTimePicker(
  modelValue: Ref<Temporal.PlainDateTime | null>,
  props: PlainDateTimePickerOptions,
) {
  const pickerBase = useDatePickerBase({
    locale: computed(() => props.locale),
    dateFormat: computed(() => props.dateFormat),
  });
  const activeMonth = ref<Temporal.PlainYearMonth>(
    modelValue.value?.toPlainDate().toPlainYearMonth()
      ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
  );
  /** Time chosen before there is a date; applied when a date is selected. */
  const pendingTime = ref<CoarTimeValue | null>(null);
  const displayValue = ref('');
  /** The text in the field is no value; set when the field is left. */
  const refused = ref(false);

  const precision = computed<CoarTimePrecision>(() => props.precision ?? 'minute');
  const effectiveUse24Hour = computed(() => {
    if (props.use24Hour === true) return true;
    if (props.use24Hour === false) return false;
    return !coarDetect12HourFormat(pickerBase.effectiveLocale.value);
  });
  const inputPlaceholder = computed(() => {
    if (props.placeholder) return props.placeholder;
    const datePart = pickerBase.effectiveDateFormat.value.pattern.toUpperCase();
    const time = { minute: 'HH:MM', second: 'HH:MM:SS', millisecond: 'HH:MM:SS.MSS' }[precision.value];
    return effectiveUse24Hour.value ? `${datePart} ${time}` : `${datePart} ${time} AM/PM`;
  });
  const selectedDate = computed((): Temporal.PlainDate | null =>
    modelValue.value ? modelValue.value.toPlainDate() : null,
  );
  const selectedTime = computed((): CoarTimeValue | null => {
    if (modelValue.value) return { hours: modelValue.value.hour, minutes: modelValue.value.minute };
    return pendingTime.value;
  });
  const minDate = computed((): Temporal.PlainDate | null => props.min ? props.min.toPlainDate() : null);
  const maxDate = computed((): Temporal.PlainDate | null => props.max ? props.max.toPlainDate() : null);
  /** Time bounds apply only on the boundary dates. */
  const effectiveMinTime = computed((): CoarTimeValue | null => {
    if (!props.min || !selectedDate.value) return null;
    if (Temporal.PlainDate.compare(selectedDate.value, props.min.toPlainDate()) === 0) {
      return { hours: props.min.hour, minutes: props.min.minute };
    }
    return null;
  });
  const effectiveMaxTime = computed((): CoarTimeValue | null => {
    if (!props.max || !selectedDate.value) return null;
    if (Temporal.PlainDate.compare(selectedDate.value, props.max.toPlainDate()) === 0) {
      return { hours: props.max.hour, minutes: props.max.minute };
    }
    return null;
  });
  const isPrevYearDisabled = computed(() => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100);
  const isNextYearDisabled = computed(() => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50);
  const today = computed(() => Temporal.Now.plainDateISO());

  function formatValue(val: Temporal.PlainDateTime): string {
    const datePart = coarFormatPlainDate(val.toPlainDate(), pickerBase.effectiveDateFormat.value.pattern);
    const timePart = coarFormatTime(
      val.hour, val.minute, effectiveUse24Hour.value, true, coarTimeBelowMinute(val, precision.value),
    );
    return `${datePart} ${timePart}`;
  }

  /**
   * The date part must lie within the boundary dates; the time is not checked against them.
   * The time must have exactly the parts the field shows: fewer are still being
   * typed, more would be cut down.
   */
  function parseValueFromInput(text: string): Temporal.PlainDateTime | null {
    if (!text) return null;
    const parts = text.split(' ');
    if (parts.length < 2) return null;
    const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern, {
      min: minDate.value,
      max: maxDate.value,
    });
    if (!date) return null;
    const timeText = parts.slice(1).join(' ');
    const time = coarTimeTextHasPrecision(timeText, precision.value) ? coarParseTimeInput(timeText) : null;
    if (!time) return null;
    return date.toPlainDateTime(keepHidden(time));
  }

  /**
   * The time of the value, with what the field does not show, when the entry shows
   * the same time: editing only the date keeps 56.1234567 seconds (#115).
   */
  function keepHidden(time: CoarTimeValue): Temporal.PlainTimeLike {
    const current = modelValue.value;
    return current && showsTime(current, time) ? current.toPlainTime() : plainTime(time);
  }

  function showsTime(current: Temporal.PlainDateTime, time: CoarTimeValue): boolean {
    if (current.hour !== time.hours || current.minute !== time.minutes) return false;
    if (precision.value === 'minute') return true;
    if (current.second !== (time.seconds ?? 0)) return false;
    return precision.value === 'second' || current.millisecond === (time.milliseconds ?? 0);
  }

  function plainTime(time: CoarTimeValue): Temporal.PlainTimeLike {
    return { hour: time.hours, minute: time.minutes, second: time.seconds ?? 0, millisecond: time.milliseconds ?? 0 };
  }

  watch(
    [modelValue, precision],
    ([val]) => {
      displayValue.value = val ? formatValue(val) : '';
      refused.value = false;
    },
    { immediate: true },
  );

  function clampDateTime(dt: Temporal.PlainDateTime): Temporal.PlainDateTime {
    if (props.min && Temporal.PlainDateTime.compare(dt, props.min) < 0) return props.min;
    if (props.max && Temporal.PlainDateTime.compare(dt, props.max) > 0) return props.max;
    return dt;
  }

  /**
   * Commit a date and time from the panel, clamped to min/max. What the panel does
   * not show stays: with the hour and minute of the value, its seconds and smaller
   * parts are kept.
   */
  function setDateTime(date: Temporal.PlainDate, time: CoarTimeValue) {
    const current = modelValue.value;
    const keep = current && time.seconds === undefined
      && current.hour === time.hours && current.minute === time.minutes;
    modelValue.value = clampDateTime(date.toPlainDateTime(keep ? current.toPlainTime() : plainTime(time)));
  }

  /** A value keeps its time; a time chosen before there is a date, or the default, snaps to the minute step. */
  function selectDate(date: Temporal.PlainDate) {
    const time = selectedTime.value ?? props.defaultTime;
    setDateTime(date, modelValue.value
      ? time
      : { hours: time.hours, minutes: coarRoundMinutesToStep(time.minutes, props.minuteStep) });
  }

  function changeTime(time: CoarTimeValue | null) {
    if (!time) return;
    if (selectedDate.value) setDateTime(selectedDate.value, time);
    else pendingTime.value = time;
  }

  function selectMonth(month: Temporal.PlainYearMonth) {
    activeMonth.value = month;
  }

  function previousYear() {
    if (!isPrevYearDisabled.value) activeMonth.value = activeMonth.value.subtract({ years: 1 });
  }

  function nextYear() {
    if (!isNextYearDisabled.value) activeMonth.value = activeMonth.value.add({ years: 1 });
  }

  function scrollToTodayMonth() {
    activeMonth.value = today.value.toPlainYearMonth();
  }

  function clearValue() {
    modelValue.value = null;
    pendingTime.value = null;
    displayValue.value = '';
    refused.value = false;
  }

  /**
   * Typed values are committed without rounding or clamping. Text nobody changed is
   * no entry: the value may hold more than the field shows.
   */
  function changeInput(text: string) {
    displayValue.value = text;
    if (modelValue.value && text === formatValue(modelValue.value)) {
      refused.value = false;
      return;
    }
    const parsed = parseValueFromInput(text);
    if (parsed) {
      modelValue.value = parsed;
      refused.value = false;
      activeMonth.value = parsed.toPlainDate().toPlainYearMonth();
    }
  }

  /**
   * Text that is no value stays in the field as refused, and the model keeps its
   * value: an impossible day, a value outside min/max or an incomplete entry.
   */
  function blurInput() {
    const text = displayValue.value;
    refused.value = text.trim().length > 0 && !parseValueFromInput(text);
  }

  /** Shows text the field refused before it reached it, such as a pasted value too precise for it. */
  function refuseInput(text: string) {
    displayValue.value = text;
    refused.value = true;
  }

  /** Brings back the text of the model's value (Esc), ending a refusal. */
  function restoreInput() {
    displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
    refused.value = false;
  }

  return {
    pickerBase, activeMonth, pendingTime, displayValue, refused, effectiveUse24Hour, inputPlaceholder,
    selectedDate, selectedTime, minDate, maxDate, effectiveMinTime, effectiveMaxTime,
    isPrevYearDisabled, isNextYearDisabled, today,
    formatValue, parseValueFromInput, selectDate, changeTime, selectMonth, previousYear, nextYear,
    scrollToTodayMonth, clearValue, changeInput, blurInput, restoreInput, refuseInput, precision,
  };
}
