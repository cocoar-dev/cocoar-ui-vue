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
import { coarGetAllTimezones, coarFormatTimezoneLabel } from './timezone-helpers';
import type { DateFormatConfig, CoarTimeValue } from './types';

interface ZonedDateTimePickerOptions {
  readonly placeholder: string;
  readonly locale?: string;
  readonly dateFormat?: DateFormatConfig;
  readonly min: Temporal.ZonedDateTime | null;
  readonly max: Temporal.ZonedDateTime | null;
  readonly use24Hour: boolean | 'auto';
  readonly minuteStep: 1 | 5 | 10 | 15;
  readonly defaultTime: CoarTimeValue;
  readonly timeZone: string | null;
}

/**
 * Internal value logic shared by presentations of the zoned date-time picker.
 * Pass reactive props (or getters) so options remain live. DOM, masking and overlay
 * lifecycle belong to the presentation, not this composable.
 */
export function useZonedDateTimePicker(
  modelValue: Ref<Temporal.ZonedDateTime | null>,
  props: ZonedDateTimePickerOptions,
) {
  const pickerBase = useDatePickerBase({
    locale: computed(() => props.locale),
    dateFormat: computed(() => props.dateFormat),
  });
  const activeMonth = ref<Temporal.PlainYearMonth>(
    modelValue.value?.toPlainDateTime().toPlainDate().toPlainYearMonth()
      ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
  );
  const pendingTime = ref<CoarTimeValue | null>(null);
  const displayTimeZone = ref<string | null>(null);
  const displayValue = ref('');

  const userTimeZone = computed<string>(() =>
    pickerBase.timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const valueTimeZone = computed<string | null>(() => modelValue.value?.timeZoneId ?? null);
  const effectiveDisplayTimeZone = computed<string>(() => displayTimeZone.value ?? userTimeZone.value);
  const effectiveDefaultTimeZone = computed<string>(() => props.timeZone ?? userTimeZone.value);
  const locationDiffersFromUser = computed(() =>
    valueTimeZone.value != null && valueTimeZone.value !== userTimeZone.value,
  );
  const timeZonesDiffer = computed(() =>
    valueTimeZone.value != null && effectiveDisplayTimeZone.value !== valueTimeZone.value,
  );
  const timezoneIndicatorState = computed((): 'home' | 'location' | 'world' => {
    const dtz = effectiveDisplayTimeZone.value;
    const utz = userTimeZone.value;
    const vtz = valueTimeZone.value;
    if (dtz === utz) return 'home';
    if (vtz && dtz === vtz) return 'location';
    return 'world';
  });
  const timezoneIndicatorClickable = computed(() =>
    locationDiffersFromUser.value || timezoneIndicatorState.value !== 'home',
  );
  const currentTimeZoneDisplayName = computed(() =>
    coarFormatTimezoneLabel(effectiveDisplayTimeZone.value),
  );
  const valueTimeZoneLabel = computed(() => {
    const vtz = valueTimeZone.value;
    return vtz ? coarFormatTimezoneLabel(vtz) : '';
  });
  const allTimezones = coarGetAllTimezones();
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
  const workingTimeZone = computed(() => effectiveDisplayTimeZone.value);
  const valueInWorkingTz = computed(() =>
    modelValue.value ? modelValue.value.withTimeZone(workingTimeZone.value) : null,
  );
  const selectedDate = computed((): Temporal.PlainDate | null =>
    valueInWorkingTz.value ? valueInWorkingTz.value.toPlainDate() : null,
  );
  const selectedTime = computed((): CoarTimeValue | null => {
    if (valueInWorkingTz.value) {
      return { hours: valueInWorkingTz.value.hour, minutes: valueInWorkingTz.value.minute };
    }
    return pendingTime.value;
  });
  // Keep the boundary's own plain date, as in the existing picker.
  const minDate = computed((): Temporal.PlainDate | null => props.min ? props.min.toPlainDate() : null);
  const maxDate = computed((): Temporal.PlainDate | null => props.max ? props.max.toPlainDate() : null);
  const effectiveMinTime = computed((): CoarTimeValue | null => {
    if (!props.min || !selectedDate.value) return null;
    const minInWtz = props.min.withTimeZone(workingTimeZone.value);
    if (Temporal.PlainDate.compare(selectedDate.value, minInWtz.toPlainDate()) === 0) {
      return { hours: minInWtz.hour, minutes: minInWtz.minute };
    }
    return null;
  });
  const effectiveMaxTime = computed((): CoarTimeValue | null => {
    if (!props.max || !selectedDate.value) return null;
    const maxInWtz = props.max.withTimeZone(workingTimeZone.value);
    if (Temporal.PlainDate.compare(selectedDate.value, maxInWtz.toPlainDate()) === 0) {
      return { hours: maxInWtz.hour, minutes: maxInWtz.minute };
    }
    return null;
  });
  const isPrevYearDisabled = computed(() => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100);
  const isNextYearDisabled = computed(() => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50);
  const today = computed(() => Temporal.Now.plainDateISO());

  function formatValue(val: Temporal.ZonedDateTime): string {
    const inDisplayTz = val.withTimeZone(effectiveDisplayTimeZone.value);
    const datePart = coarFormatPlainDate(inDisplayTz.toPlainDate(), pickerBase.effectiveDateFormat.value.pattern);
    const timePart = coarFormatTime(inDisplayTz.hour, inDisplayTz.minute, effectiveUse24Hour.value, true);
    return `${datePart} ${timePart}`;
  }

  function formatValueInValueTz(): string {
    if (!modelValue.value) return '';
    const datePart = coarFormatPlainDate(modelValue.value.toPlainDate(), pickerBase.effectiveDateFormat.value.pattern);
    const timePart = coarFormatTime(modelValue.value.hour, modelValue.value.minute, effectiveUse24Hour.value);
    return `${datePart} ${timePart}`;
  }

  function parseValueFromInput(text: string): Temporal.ZonedDateTime | null {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern);
    if (!date) return null;
    const time = coarParseTimeInput(parts.slice(1).join(' '));
    if (!time) return null;
    const pdt = date.toPlainDateTime({ hour: time.hours, minute: time.minutes });
    const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
    try {
      return pdt.toZonedDateTime(tz);
    } catch {
      return null;
    }
  }

  watch(
    [modelValue, effectiveDisplayTimeZone],
    () => {
      displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
    },
    { immediate: true },
  );

  function clampZonedDateTime(zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    if (props.min && Temporal.Instant.compare(zdt.toInstant(), props.min.toInstant()) < 0) return props.min;
    if (props.max && Temporal.Instant.compare(zdt.toInstant(), props.max.toInstant()) > 0) return props.max;
    return zdt;
  }

  /** Interpret the panel's wall-clock time in the display zone, retaining the value's zone. */
  function setDateTime(date: Temporal.PlainDate, time: CoarTimeValue) {
    const pdt = date.toPlainDateTime({ hour: time.hours, minute: time.minutes });
    const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
    const zdt = workingTimeZone.value !== tz
      ? pdt.toZonedDateTime(workingTimeZone.value).withTimeZone(tz)
      : pdt.toZonedDateTime(tz);
    modelValue.value = clampZonedDateTime(zdt);
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

  function selectDisplayTimezone(tzId: string) {
    displayTimeZone.value = tzId;
  }

  function changeValueTimezone(newTzId: string) {
    if (modelValue.value) modelValue.value = modelValue.value.toPlainDateTime().toZonedDateTime(newTzId);
  }

  function toggleDisplayTimezone() {
    if (!timezoneIndicatorClickable.value) return;
    const state = timezoneIndicatorState.value;
    if (state === 'home' && valueTimeZone.value && valueTimeZone.value !== userTimeZone.value) {
      displayTimeZone.value = valueTimeZone.value;
    } else {
      displayTimeZone.value = userTimeZone.value;
    }
  }

  function clearValue() {
    modelValue.value = null;
    pendingTime.value = null;
    displayValue.value = '';
  }

  function changeInput(text: string) {
    displayValue.value = text;
    const parsed = parseValueFromInput(text);
    if (parsed) {
      modelValue.value = parsed;
      const inWtz = parsed.withTimeZone(workingTimeZone.value);
      activeMonth.value = inWtz.toPlainDate().toPlainYearMonth();
    }
  }

  function blurInput() {
    const text = displayValue.value;
    const parsed = parseValueFromInput(text);
    if (!parsed && text.length > 0) displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
  }

  return {
    pickerBase, activeMonth, pendingTime, displayTimeZone, displayValue,
    userTimeZone, valueTimeZone, effectiveDisplayTimeZone, effectiveDefaultTimeZone,
    locationDiffersFromUser, timeZonesDiffer, timezoneIndicatorState, timezoneIndicatorClickable,
    currentTimeZoneDisplayName, valueTimeZoneLabel, allTimezones, effectiveUse24Hour, inputPlaceholder,
    workingTimeZone, valueInWorkingTz, selectedDate, selectedTime, minDate, maxDate,
    effectiveMinTime, effectiveMaxTime, isPrevYearDisabled, isNextYearDisabled, today,
    formatValue, formatValueInValueTz, parseValueFromInput, selectDate, changeTime,
    selectMonth, previousYear, nextYear, scrollToTodayMonth, selectDisplayTimezone,
    changeValueTimezone, toggleDisplayTimezone, clearValue, changeInput, blurInput,
  };
}
