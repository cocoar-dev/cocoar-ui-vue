import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { usePlainDateTimePicker } from '../use-plain-date-time-picker';
import type { CoarTimeValue, DateFormatConfig, CoarTimePrecision } from '../types';

vi.mock('@cocoar/vue-localization', () => ({
  useL10n: () => ({ language: ref('en-GB'), localeData: ref(null) }),
  useTimezone: () => ({ timezone: ref('Europe/Vienna') }),
}));

const scopes: EffectScope[] = [];
const date = (value: string) => Temporal.PlainDate.from(value);
const dateTime = (value: string) => Temporal.PlainDateTime.from(value);

function createPicker(value: Temporal.PlainDateTime | null = null) {
  const model = ref<Temporal.PlainDateTime | null>(value);
  const props = reactive({
    placeholder: '',
    locale: 'en-GB' as string | undefined,
    dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as DateFormatConfig | undefined,
    min: null as Temporal.PlainDateTime | null,
    max: null as Temporal.PlainDateTime | null,
    use24Hour: true as boolean | 'auto',
    minuteStep: 5 as 1 | 5 | 10 | 15,
    defaultTime: { hours: 9, minutes: 0 } as CoarTimeValue,
    precision: 'minute' as CoarTimePrecision,
  });
  const scope = effectScope();
  scopes.push(scope);
  const picker = scope.run(() => usePlainDateTimePicker(model, props))!;
  return { model, props, picker };
}

beforeEach(() => {
  vi.spyOn(Temporal.Now, 'plainDateISO').mockReturnValue(date('2026-03-10'));
});

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});

describe('usePlainDateTimePicker', () => {
  it('starts with the value month or today, without opening the presentation', () => {
    expect(createPicker().picker.activeMonth.value.toString()).toBe('2026-03');
    const { picker } = createPicker(dateTime('2025-12-31T23:30'));
    expect(picker.activeMonth.value.toString()).toBe('2025-12');
    expect(picker.displayValue.value).toBe('31.12.2025 23:30');
    expect(picker.selectedDate.value?.toString()).toBe('2025-12-31');
    expect(picker.selectedTime.value).toEqual({ hours: 23, minutes: 30 });
    expect(picker.pickerBase.isOpen.value).toBe(false);
    expect(picker.pendingTime.value).toBeNull();
  });

  it.each([
    ['dd.mm.yyyy', '14.03.2026 14:05', 'DD.MM.YYYY HH:MM'],
    ['dd/mm/yyyy', '14/03/2026 14:05', 'DD/MM/YYYY HH:MM'],
    ['mm/dd/yyyy', '03/14/2026 14:05', 'MM/DD/YYYY HH:MM'],
    ['yyyy-mm-dd', '2026-03-14 14:05', 'YYYY-MM-DD HH:MM'],
  ] as const)('formats and parses with the pattern %s', (pattern, text, placeholder) => {
    const { picker, props } = createPicker();
    props.dateFormat = { pattern, firstDayOfWeek: 1 };
    expect(picker.formatValue(dateTime('2026-03-14T14:05'))).toBe(text);
    expect(picker.parseValueFromInput(text)?.toString()).toBe('2026-03-14T14:05:00');
    expect(picker.inputPlaceholder.value).toBe(placeholder);
  });

  it('formats 12-hour time and derives the clock and pattern from the locale', () => {
    const { picker, props } = createPicker();
    props.use24Hour = false;
    const formatted = picker.formatValue(dateTime('2026-03-14T14:30'));
    expect(formatted).toBe('14.03.2026 02:30 PM');
    expect(picker.parseValueFromInput(formatted)?.toString()).toBe('2026-03-14T14:30:00');
    expect(picker.parseValueFromInput('14.03.2026 02:30 PM')?.toString()).toBe('2026-03-14T14:30:00');
    expect(picker.inputPlaceholder.value).toBe('DD.MM.YYYY HH:MM AM/PM');
    props.use24Hour = 'auto';
    props.dateFormat = undefined;
    props.locale = 'en-US';
    expect(picker.effectiveUse24Hour.value).toBe(false);
    expect(picker.inputPlaceholder.value).toBe('MM/DD/YYYY HH:MM AM/PM');
    props.locale = 'de-DE';
    expect(picker.effectiveUse24Hour.value).toBe(true);
    expect(picker.formatValue(dateTime('2026-03-14T14:30'))).toBe('14.03.2026 14:30');
    props.placeholder = 'Choose';
    expect(picker.inputPlaceholder.value).toBe('Choose');
  });

  it('keeps the display watcher on the model only, as before', async () => {
    const { picker, props } = createPicker(dateTime('2026-03-14T14:30'));
    props.use24Hour = false;
    await nextTick();
    expect(picker.displayValue.value).toBe('14.03.2026 14:30');
  });

  it('returns null for invalid dates and times; a leading space is not trimmed', () => {
    const { picker } = createPicker();
    for (const text of ['', 'nonsense', '14.03.2026', '31.02.2026 09:00', '14.03.2026 25:00', ' 14.03.2026 09:00']) {
      expect(picker.parseValueFromInput(text)).toBeNull();
    }
  });

  it('rejects typed dates outside the boundary dates but not times outside the boundary times', () => {
    const { picker, props, model } = createPicker();
    props.min = dateTime('2026-03-05T10:00');
    props.max = dateTime('2026-03-20T16:00');
    expect(picker.parseValueFromInput('04.03.2026 12:00')).toBeNull();
    expect(picker.parseValueFromInput('21.03.2026 12:00')).toBeNull();
    picker.changeInput('05.03.2026 08:00');
    expect(model.value?.toString()).toBe('2026-03-05T08:00:00');
  });

  it('selects a date with the default time, rounded to the minute step', () => {
    const { picker, props, model } = createPicker();
    props.defaultTime = { hours: 9, minutes: 7 };
    props.minuteStep = 15;
    picker.selectDate(date('2026-03-14'));
    expect(model.value?.toString()).toBe('2026-03-14T09:00:00');
  });

  it('keeps what the field does not show when only the typed date changes (#115)', () => {
    const { picker, props, model } = createPicker(Temporal.PlainDateTime.from('2026-06-30T20:45:56.1234567'));
    props.precision = 'millisecond';
    picker.changeInput('01.07.2026 20:45:56.123');
    expect(model.value?.toString()).toBe('2026-07-01T20:45:56.1234567');
    picker.changeInput('01.07.2026 20:45:57.000');
    expect(model.value?.toString()).toBe('2026-07-01T20:45:57');
  });

  it('keeps the existing time exactly when selecting another date (#111)', () => {
    const { picker, model } = createPicker(Temporal.PlainDateTime.from('2026-03-14T10:32:56.123'));
    picker.selectDate(date('2026-03-16'));
    expect(model.value?.toString()).toBe('2026-03-16T10:32:56.123');
    picker.changeTime({ hours: 10, minutes: 45 });
    expect(model.value?.toString()).toBe('2026-03-16T10:45:00');
  });

  it('keeps pending time until there is a date; null time changes do nothing', () => {
    const { picker, model } = createPicker();
    picker.changeTime({ hours: 11, minutes: 12 });
    picker.changeTime(null);
    expect(model.value).toBeNull();
    expect(picker.pendingTime.value).toEqual({ hours: 11, minutes: 12 });
    expect(picker.selectedTime.value).toEqual({ hours: 11, minutes: 12 });
    picker.selectDate(date('2026-03-14'));
    expect(model.value?.toString()).toBe('2026-03-14T11:10:00');
  });

  it('changes the time of a selected date without rounding', () => {
    const { picker, model } = createPicker(dateTime('2026-03-14T10:30'));
    picker.changeTime({ hours: 18, minutes: 17 });
    expect(model.value?.toString()).toBe('2026-03-14T18:17:00');
  });

  it('clamps date and time selections to min and max', () => {
    const { picker, props, model } = createPicker();
    props.min = dateTime('2026-03-14T09:30');
    props.max = dateTime('2026-03-16T18:00');
    picker.selectDate(date('2026-03-13'));
    expect(model.value?.toString()).toBe('2026-03-14T09:30:00');
    picker.selectDate(date('2026-03-17'));
    expect(model.value?.toString()).toBe('2026-03-16T18:00:00');
    picker.changeTime({ hours: 20, minutes: 0 });
    expect(model.value?.toString()).toBe('2026-03-16T18:00:00');
    picker.selectDate(date('2026-03-14'));
    picker.changeTime({ hours: 0, minutes: 0 });
    expect(model.value?.toString()).toBe('2026-03-14T09:30:00');
  });

  it('exposes boundary dates and time bounds only on the boundary dates', () => {
    const { picker, props, model } = createPicker(dateTime('2026-03-14T12:00'));
    props.min = dateTime('2026-03-14T09:30');
    props.max = dateTime('2026-03-16T18:00');
    expect(picker.minDate.value?.toString()).toBe('2026-03-14');
    expect(picker.maxDate.value?.toString()).toBe('2026-03-16');
    expect(picker.effectiveMinTime.value).toEqual({ hours: 9, minutes: 30 });
    expect(picker.effectiveMaxTime.value).toBeNull();
    model.value = dateTime('2026-03-16T12:00');
    expect(picker.effectiveMinTime.value).toBeNull();
    expect(picker.effectiveMaxTime.value).toEqual({ hours: 18, minutes: 0 });
    model.value = null;
    expect(picker.effectiveMinTime.value).toBeNull();
  });

  it('commits typed input without rounding and moves the active month to it', async () => {
    const { picker, model } = createPicker();
    picker.changeInput('31.05.2026 23:17');
    expect(model.value?.toString()).toBe('2026-05-31T23:17:00');
    expect(picker.activeMonth.value.toString()).toBe('2026-05');
    await nextTick();
    expect(picker.displayValue.value).toBe('31.05.2026 23:17');
  });

  it('refuses invalid nonempty input on blur, leaving the model alone', () => {
    const { picker, model } = createPicker(dateTime('2026-03-14T10:30'));
    picker.changeInput('14.03.2026 1');
    expect(picker.displayValue.value).toBe('14.03.2026 1');
    picker.blurInput();
    expect(picker.displayValue.value).toBe('14.03.2026 1');
    expect(picker.refused.value).toBe(true);
    picker.changeInput('30.02.2026 10:30');
    picker.blurInput();
    expect(picker.refused.value).toBe(true);
    expect(model.value?.toString()).toBe('2026-03-14T10:30:00');
    picker.restoreInput();
    expect(picker.displayValue.value).toBe('14.03.2026 10:30');
    expect(picker.refused.value).toBe(false);
    picker.changeInput('');
    picker.blurInput();
    expect(picker.displayValue.value).toBe('');
    expect(model.value?.hour).toBe(10);
  });

  it('refuses invalid input without a value on blur and resets pending time on clear', () => {
    const { picker, model } = createPicker();
    picker.changeInput('incomplete');
    picker.blurInput();
    expect(picker.displayValue.value).toBe('incomplete');
    expect(picker.refused.value).toBe(true);
    picker.changeTime({ hours: 12, minutes: 0 });
    picker.clearValue();
    expect(model.value).toBeNull();
    expect(picker.pendingTime.value).toBeNull();
    expect(picker.displayValue.value).toBe('');
  });

  it('reacts to external model changes without moving the active month', async () => {
    const { picker, model } = createPicker();
    model.value = dateTime('2026-06-14T10:30');
    await nextTick();
    expect(picker.displayValue.value).toBe('14.06.2026 10:30');
    expect(picker.selectedDate.value?.toString()).toBe('2026-06-14');
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
    model.value = null;
    await nextTick();
    expect(picker.displayValue.value).toBe('');
  });

  it('navigates months and today, guarding the existing year limits', () => {
    const { picker } = createPicker();
    picker.selectMonth(Temporal.PlainYearMonth.from('1926-04'));
    picker.previousYear();
    expect(picker.activeMonth.value.year).toBe(1926);
    picker.nextYear();
    expect(picker.activeMonth.value.year).toBe(1927);
    picker.selectMonth(Temporal.PlainYearMonth.from('2076-04'));
    picker.nextYear();
    expect(picker.activeMonth.value.year).toBe(2076);
    picker.scrollToTodayMonth();
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
  });
});
