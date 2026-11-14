import { computed, ref, watch, type Ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useDatePickerBase } from './use-date-picker-base';
import { coarFormatPlainDate, coarParsePlainDateFromInput } from './date-helpers';
import type { DateFormatConfig } from './types';

interface PlainDatePickerOptions {
  readonly placeholder: string;
  readonly locale?: string;
  readonly dateFormat?: DateFormatConfig;
  readonly min: Temporal.PlainDate | null;
  readonly max: Temporal.PlainDate | null;
}

/**
 * Internal value logic shared by presentations of the plain date picker.
 * Pass reactive props (or getters) so options remain live. DOM, masking and overlay
 * lifecycle belong to the presentation, not this composable.
 */
export function usePlainDatePicker(
  modelValue: Ref<Temporal.PlainDate | null>,
  props: PlainDatePickerOptions,
) {
  const pickerBase = useDatePickerBase({
    locale: computed(() => props.locale),
    dateFormat: computed(() => props.dateFormat),
  });
  const activeMonth = ref<Temporal.PlainYearMonth>(
    modelValue.value?.toPlainYearMonth() ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
  );
  const displayValue = ref('');

  const inputPlaceholder = computed(
    () => props.placeholder || pickerBase.effectiveDateFormat.value.pattern.toUpperCase(),
  );
  const isPrevYearDisabled = computed(() => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100);
  const isNextYearDisabled = computed(() => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50);
  const today = computed(() => Temporal.Now.plainDateISO());

  function formatValue(val: Temporal.PlainDate): string {
    return coarFormatPlainDate(val, pickerBase.effectiveDateFormat.value.pattern);
  }

  /** Typed dates outside min/max are rejected, not clamped. */
  function parseValueFromInput(text: string): Temporal.PlainDate | null {
    return coarParsePlainDateFromInput(text, pickerBase.effectiveDateFormat.value.pattern, {
      min: props.min,
      max: props.max,
    });
  }

  watch(
    modelValue,
    (val) => {
      displayValue.value = val ? formatValue(val) : '';
    },
    { immediate: true },
  );

  /** The panel offers only dates within min/max, so selection does not clamp. */
  function selectDate(date: Temporal.PlainDate) {
    modelValue.value = date;
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
    displayValue.value = '';
  }

  function changeInput(text: string) {
    displayValue.value = text;
    const parsed = parseValueFromInput(text);
    if (parsed) {
      modelValue.value = parsed;
      activeMonth.value = parsed.toPlainYearMonth();
    }
  }

  function blurInput() {
    const text = displayValue.value;
    const parsed = parseValueFromInput(text);
    if (!parsed && text.length > 0) displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
  }

  return {
    pickerBase, activeMonth, displayValue, inputPlaceholder,
    isPrevYearDisabled, isNextYearDisabled, today,
    formatValue, parseValueFromInput, selectDate, selectMonth, previousYear, nextYear,
    scrollToTodayMonth, clearValue, changeInput, blurInput,
  };
}
