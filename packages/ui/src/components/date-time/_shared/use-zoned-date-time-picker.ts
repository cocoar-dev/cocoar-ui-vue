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
import { coarGetAllTimezones, coarFormatTimezoneLabel } from './timezone-helpers';
import type { DateFormatConfig, CoarTimePrecision, CoarTimeValue } from './types';

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
  /** How exactly the field shows and takes the time; defaults to `'minute'`. */
  readonly precision?: CoarTimePrecision;
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
  /** The text in the field is no value; set when the field is left. */
  const refused = ref(false);

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
    const timePart = coarFormatTime(
      inDisplayTz.hour, inDisplayTz.minute, effectiveUse24Hour.value, true,
      coarTimeBelowMinute(inDisplayTz, precision.value),
    );
    return `${datePart} ${timePart}`;
  }

  function formatValueInValueTz(): string {
    if (!modelValue.value) return '';
    const datePart = coarFormatPlainDate(modelValue.value.toPlainDate(), pickerBase.effectiveDateFormat.value.pattern);
    const timePart = coarFormatTime(
      modelValue.value.hour, modelValue.value.minute, effectiveUse24Hour.value, false,
      coarTimeBelowMinute(modelValue.value, precision.value),
    );
    return `${datePart} ${timePart}`;
  }

  /**
   * The text is read in the zone it is shown in, the result keeps the value's zone.
   * The time must have exactly the parts the field shows: fewer are still being
   * typed, more would be cut down.
   */
  function parseValueFromInput(text: string): Temporal.ZonedDateTime | null {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern);
    if (!date) return null;
    const timeText = parts.slice(1).join(' ');
    const time = coarTimeTextHasPrecision(timeText, precision.value) ? coarParseTimeInput(timeText) : null;
    if (!time) return null;
    try {
      return toZoned(date.toPlainDateTime(plainTime(time)));
    } catch {
      return null;
    }
  }

  function plainTime(time: CoarTimeValue): Temporal.PlainTimeLike {
    return { hour: time.hours, minute: time.minutes, second: time.seconds ?? 0, millisecond: time.milliseconds ?? 0 };
  }

  /** A wall-clock time of the working zone, as an instant in the value's zone. */
  function toZoned(pdt: Temporal.PlainDateTime): Temporal.ZonedDateTime {
    const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
    return pdt.toZonedDateTime(workingTimeZone.value).withTimeZone(tz);
  }

  watch(
    [modelValue, effectiveDisplayTimeZone],
    () => {
      displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
      refused.value = false;
    },
    { immediate: true },
  );

  function clampZonedDateTime(zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    if (props.min && Temporal.Instant.compare(zdt.toInstant(), props.min.toInstant()) < 0) return props.min;
    if (props.max && Temporal.Instant.compare(zdt.toInstant(), props.max.toInstant()) > 0) return props.max;
    return zdt;
  }

  /**
   * Interpret the panel's wall-clock time in the display zone, retaining the value's zone.
   * What the panel does not show stays: with the hour and minute of the value, its
   * seconds and smaller parts are kept.
   */
  function setDateTime(date: Temporal.PlainDate, time: CoarTimeValue) {
    const current = valueInWorkingTz.value;
    const keep = current && time.seconds === undefined
      && current.hour === time.hours && current.minute === time.minutes;
    const pdt = date.toPlainDateTime(keep ? current.toPlainTime() : plainTime(time));
    modelValue.value = clampZonedDateTime(toZoned(pdt));
  }

  /** A value keeps its time; a time chosen before there is a date, or the default, snaps to the minute step. */
  function selectDate(date: Temporal.PlainDate) {
    const time = selectedTime.value ?? props.defaultTime;
    setDateTime(date, valueInWorkingTz.value
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
    refused.value = false;
  }

  /** Text nobody changed is no entry: the value may hold more than the field shows. */
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
      const inWtz = parsed.withTimeZone(workingTimeZone.value);
      activeMonth.value = inWtz.toPlainDate().toPlainYearMonth();
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
    pickerBase, activeMonth, pendingTime, displayTimeZone, displayValue, refused,
    userTimeZone, valueTimeZone, effectiveDisplayTimeZone, effectiveDefaultTimeZone,
    locationDiffersFromUser, timeZonesDiffer, timezoneIndicatorState, timezoneIndicatorClickable,
    currentTimeZoneDisplayName, valueTimeZoneLabel, allTimezones, effectiveUse24Hour, inputPlaceholder,
    workingTimeZone, valueInWorkingTz, selectedDate, selectedTime, minDate, maxDate,
    effectiveMinTime, effectiveMaxTime, isPrevYearDisabled, isNextYearDisabled, today,
    formatValue, formatValueInValueTz, parseValueFromInput, selectDate, changeTime,
    selectMonth, previousYear, nextYear, scrollToTodayMonth, selectDisplayTimezone,
    changeValueTimezone, toggleDisplayTimezone, clearValue, changeInput, blurInput, restoreInput, refuseInput, precision,
  };
}
