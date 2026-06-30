import { computed, watch, type Ref } from 'vue';
import type { Temporal } from '@js-temporal/polyfill';

/**
 * Conversion hooks for an "either a date, or a date-with-time" picker. The
 * date side is always a `Temporal.PlainDate`; `TDateTime` is the with-time type
 * (`ZonedDateTime` or `PlainDateTime`) supplied by the concrete component.
 */
export interface DateOrTimeConverters<TDateTime> {
  /** Runtime type-guard separating the date-time value from a plain date. */
  isDateTime: (value: unknown) => value is TDateTime;
  /** Promote a date to a date-time (e.g. attach a default time / zone). */
  toDateTime: (date: Temporal.PlainDate) => TDateTime;
  /** Drop the time (and zone) back to a plain date. */
  toDate: (dateTime: TDateTime) => Temporal.PlainDate;
}

/**
 * Shared state for `CoarZonedDateTimeOrDatePicker` / `CoarPlainDateTimeOrDatePicker`.
 * Keeps a single union `modelValue` (`PlainDate | TDateTime | null`) and a
 * `withTime` flag in sync, splits the value for the two child pickers, and
 * converts it when the clock toggle flips the mode.
 */
export function useDateOrTime<TDateTime>(
  modelValue: Ref<Temporal.PlainDate | TDateTime | null>,
  withTime: Ref<boolean>,
  conv: DateOrTimeConverters<TDateTime>,
) {
  // A non-null value's own type IS the mode — keep `withTime` consistent with
  // it. While empty, the mode is whatever the toggle / consumer last set.
  watch(
    modelValue,
    (value) => {
      if (value != null) withTime.value = conv.isDateTime(value);
    },
    { immediate: true },
  );

  const dateValue = computed<Temporal.PlainDate | null>(() => {
    const value = modelValue.value;
    return value != null && !conv.isDateTime(value) ? (value as Temporal.PlainDate) : null;
  });

  const dateTimeValue = computed<TDateTime | null>(() => {
    const value = modelValue.value;
    return value != null && conv.isDateTime(value) ? value : null;
  });

  const setDate = (value: Temporal.PlainDate | null): void => {
    modelValue.value = value;
  };
  const setDateTime = (value: TDateTime | null): void => {
    modelValue.value = value;
  };

  /** Flip date ⇄ date-time, converting the current value if there is one. */
  const toggle = (): void => {
    const next = !withTime.value;
    const current = modelValue.value;
    if (current == null) {
      withTime.value = next;
      return;
    }
    if (next && !conv.isDateTime(current)) {
      modelValue.value = conv.toDateTime(current as Temporal.PlainDate);
    } else if (!next && conv.isDateTime(current)) {
      modelValue.value = conv.toDate(current);
    }
    withTime.value = next;
  };

  return { dateValue, dateTimeValue, setDate, setDateTime, toggle };
}
