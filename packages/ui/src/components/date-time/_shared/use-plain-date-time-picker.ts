import { computed, ref, watch, type Ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from './use-date-picker-base';
import { coarFormatPlainDate, coarParsePlainDateFromInput } from './date-helpers';
import {
  coarFormatTime,
  coarParseTimeInput,
  coarDetect12HourFormat,
  coarRoundMinutesToStep,
} from './time-helpers';
import type { DateFormatConfig, CoarTimeValue } from './types';

interface PlainDateTimePickerOptions {
  readonly placeholder: string;
  readonly locale?: string;
  readonly dateFormat?: DateFormatConfig;
  readonly min: Temporal.PlainDateTime | null;
  readonly max: Temporal.PlainDateTime | null;
  readonly use24Hour: boolean | 'auto';
  readonly minuteStep: 1 | 5 | 10 | 15;
  readonly defaultTime: CoarTimeValue;
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

  const effectiveUse24Hour = computed(() => {
    if (props.use24Hour === true) return true;
    if (props.use24Hour === false) return false;
    return !coarDetect12HourFormat(pickerBase.effectiveLocale.value);
  });
  const inputPlaceholder = computed(() => {
    if (props.placeholder) return props.placeholder;
    const datePart = pickerBase.effectiveDateFormat.value.pattern.toUpperCase();
    return effectiveUse24Hour.value ? `${datePart} HH:MM` : `${datePart} HH:MM AM/PM`;
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
    const timePart = coarFormatTime(val.hour, val.minute, effectiveUse24Hour.value, true);
    return `${datePart} ${timePart}`;
  }

  /** The date part must lie within the boundary dates; the time is not checked against them. */
  function parseValueFromInput(text: string): Temporal.PlainDateTime | null {
    if (!text) return null;
    const parts = text.split(' ');
    if (parts.length < 2) return null;
    const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern, {
      min: minDate.value,
      max: maxDate.value,
    });
    if (!date) return null;
    const time = coarParseTimeInput(parts.slice(1).join(' '));
    if (!time) return null;
    return date.toPlainDateTime({ hour: time.hours, minute: time.minutes });
  }

  watch(
    modelValue,
    (val) => {
      displayValue.value = val ? formatValue(val) : '';
    },
    { immediate: true },
  );

  function clampDateTime(dt: Temporal.PlainDateTime): Temporal.PlainDateTime {
    if (props.min && Temporal.PlainDateTime.compare(dt, props.min) < 0) return props.min;
    if (props.max && Temporal.PlainDateTime.compare(dt, props.max) > 0) return props.max;
    return dt;
  }

  /** Commit a date and time from the panel, clamped to min/max. */
  function setDateTime(date: Temporal.PlainDate, time: CoarTimeValue) {
    modelValue.value = clampDateTime(date.toPlainDateTime({ hour: time.hours, minute: time.minutes }));
  }

  function selectDate(date: Temporal.PlainDate) {
    const time = selectedTime.value ?? props.defaultTime;
    setDateTime(date, { hours: time.hours, minutes: coarRoundMinutesToStep(time.minutes, props.minuteStep) });
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
  }

  /** Typed values are committed without rounding or clamping. */
  function changeInput(text: string) {
    displayValue.value = text;
    const parsed = parseValueFromInput(text);
    if (parsed) {
      modelValue.value = parsed;
      activeMonth.value = parsed.toPlainDate().toPlainYearMonth();
    }
  }

  function blurInput() {
    const text = displayValue.value;
    const parsed = parseValueFromInput(text);
    if (!parsed && text.length > 0) displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
  }

  return {
    pickerBase, activeMonth, pendingTime, displayValue, effectiveUse24Hour, inputPlaceholder,
    selectedDate, selectedTime, minDate, maxDate, effectiveMinTime, effectiveMaxTime,
    isPrevYearDisabled, isNextYearDisabled, today,
    formatValue, parseValueFromInput, selectDate, changeTime, selectMonth, previousYear, nextYear,
    scrollToTodayMonth, clearValue, changeInput, blurInput,
  };
}
