import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useZonedDateTimePicker } from '../use-zoned-date-time-picker';
import type { DateFormatConfig } from '../types';

const homeZone = ref('Europe/Vienna');
vi.mock('@cocoar/vue-localization', () => ({
  useL10n: () => ({ language: ref('en-GB'), localeData: ref(null) }),
  useTimezone: () => ({ timezone: homeZone }),
}));

const scopes: EffectScope[] = [];
const date = (value: string) => Temporal.PlainDate.from(value);
const zoned = (value: string) => Temporal.ZonedDateTime.from(value);

function createPicker(value: Temporal.ZonedDateTime | null = null) {
  const model = ref<Temporal.ZonedDateTime | null>(value);
  const props = reactive({
    placeholder: '',
    locale: 'en-GB',
    dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as DateFormatConfig,
    min: null as Temporal.ZonedDateTime | null,
    max: null as Temporal.ZonedDateTime | null,
    use24Hour: true as boolean | 'auto',
    minuteStep: 5 as 1 | 5 | 10 | 15,
    defaultTime: { hours: 9, minutes: 0 },
    timeZone: null as string | null,
  });
  const scope = effectScope();
  scopes.push(scope);
  const picker = scope.run(() => useZonedDateTimePicker(model, props))!;
  return { model, props, picker };
}

beforeEach(() => {
  homeZone.value = 'Europe/Vienna';
  vi.spyOn(Temporal.Now, 'plainDateISO').mockReturnValue(date('2026-03-10'));
});

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});

describe('useZonedDateTimePicker', () => {
  it('reads typed text in the zone it is shown in, and keeps the value zone', () => {
    // Shown in Vienna (04:30), the value lives in New York (23:30 the day before).
    const { picker, model } = createPicker(zoned('2026-03-14T23:30[America/New_York]'));
    expect(picker.displayValue.value).toBe('15.03.2026 04:30');
    picker.changeInput('15.03.2026 04:45');
    expect(model.value?.toString()).toBe('2026-03-14T23:45:00-04:00[America/New_York]');
  });

  it('starts with the value month or today, without opening the presentation', () => {
    expect(createPicker().picker.activeMonth.value.toString()).toBe('2026-03');
    const { picker } = createPicker(zoned('2025-12-31T23:30[America/New_York]'));
    expect(picker.activeMonth.value.toString()).toBe('2025-12');
    expect(picker.pickerBase.isOpen.value).toBe(false);
    expect(picker.pendingTime.value).toBeNull();
  });

  it('formats the input in the home zone and the footer in the value zone', () => {
    const { picker } = createPicker(zoned('2026-03-14T23:30[America/New_York]'));
    expect(picker.displayValue.value).toBe('15.03.2026 04:30');
    expect(picker.formatValueInValueTz()).toBe('14.03.2026 23:30');
    expect(picker.selectedDate.value?.toString()).toBe('2026-03-15');
    expect(picker.selectedTime.value).toEqual({ hours: 4, minutes: 30 });
  });

  it('reads text in the display zone and retains the value zone', () => {
    const { picker } = createPicker(zoned('2026-03-14T23:30[America/New_York]'));
    picker.selectDisplayTimezone('Asia/Tokyo');
    const parsed = picker.parseValueFromInput('16.03.2026 10:45')!;
    expect(parsed.timeZoneId).toBe('America/New_York');
    expect(parsed.withTimeZone('Asia/Tokyo').toPlainDateTime().toString()).toBe('2026-03-16T10:45:00');
  });

  it('uses an explicit default zone for new values and the home zone otherwise', () => {
    const { picker, props } = createPicker();
    expect(picker.parseValueFromInput('14.03.2026 09:00')?.timeZoneId).toBe('Europe/Vienna');
    props.timeZone = 'Asia/Tokyo';
    expect(picker.parseValueFromInput('14.03.2026 09:00')?.timeZoneId).toBe('Asia/Tokyo');
    expect(picker.effectiveDisplayTimeZone.value).toBe('Europe/Vienna');
  });

  it.each([
    ['29.03.2026 02:30', '2026-03-29T03:30:00+02:00[Europe/Vienna]'],
    ['25.10.2026 02:30', '2026-10-25T02:30:00+02:00[Europe/Vienna]'],
  ])('keeps Temporal compatible disambiguation when parsing %s', (input, expected) => {
    expect(createPicker().picker.parseValueFromInput(input)?.toString()).toBe(expected);
  });

  it('returns null for invalid dates, times and zones', () => {
    const { picker, props } = createPicker();
    for (const text of ['', 'nonsense', '14.03.2026', '31.02.2026 09:00', '14.03.2026 25:00']) {
      expect(picker.parseValueFromInput(text)).toBeNull();
    }
    props.timeZone = 'Invalid/Zone';
    expect(picker.parseValueFromInput('14.03.2026 09:00')).toBeNull();
  });

  it('selects a date with the default time, rounded to the minute step', () => {
    const { picker, props, model } = createPicker();
    props.defaultTime = { hours: 9, minutes: 7 };
    props.minuteStep = 15;
    picker.selectDate(date('2026-03-14'));
    expect(model.value?.toString()).toBe('2026-03-14T09:00:00+01:00[Europe/Vienna]');
  });

  it('keeps pending time until there is a date; null time changes do nothing', () => {
    const { picker, model } = createPicker();
    picker.changeTime({ hours: 11, minutes: 12 });
    picker.changeTime(null);
    expect(model.value).toBeNull();
    expect(picker.selectedTime.value).toEqual({ hours: 11, minutes: 12 });
    picker.selectDate(date('2026-03-14'));
    expect(model.value?.hour).toBe(11);
    expect(model.value?.minute).toBe(10);
  });

  it('selects dates in the display zone and retains the existing value zone', () => {
    const { picker, model } = createPicker(zoned('2026-03-14T10:32:56.123[America/New_York]'));
    picker.selectDate(date('2026-03-16'));
    expect(model.value?.toString()).toBe('2026-03-16T10:32:56.123-04:00[America/New_York]');
    picker.changeTime({ hours: 18, minutes: 17 });
    expect(model.value?.toString()).toBe('2026-03-16T13:17:00-04:00[America/New_York]');
  });

  it.each([
    ['2026-03-29', { hours: 2, minutes: 30 }, '2026-03-29T03:30:00+02:00[Europe/Vienna]'],
    ['2026-10-25', { hours: 2, minutes: 30 }, '2026-10-25T02:30:00+02:00[Europe/Vienna]'],
  ])('keeps Temporal DST behavior when selecting %s', (day, time, expected) => {
    const { picker, props, model } = createPicker();
    props.defaultTime = time;
    picker.selectDate(date(day));
    expect(model.value?.toString()).toBe(expected);
  });

  it('clamps date and time selections by instant, including boundaries in different zones', () => {
    const { picker, props, model } = createPicker();
    props.min = zoned('2026-03-14T09:00[America/New_York]');
    props.max = zoned('2026-03-16T18:00[Asia/Tokyo]');
    picker.selectDate(date('2026-03-13'));
    expect(model.value?.equals(props.min)).toBe(true);
    picker.selectDate(date('2026-03-17'));
    expect(model.value?.equals(props.max)).toBe(true);
    picker.selectDate(date('2026-03-14'));
    picker.changeTime({ hours: 0, minutes: 0 });
    expect(model.value?.equals(props.min)).toBe(true);
  });

  it('keeps calendar boundary dates in their own zone but time bounds in the display zone', () => {
    const { picker, props, model } = createPicker(zoned('2026-03-15T14:00[Europe/Vienna]'));
    props.min = zoned('2026-03-14T23:30[America/New_York]');
    props.max = zoned('2026-03-15T23:00[Asia/Tokyo]');
    expect(picker.minDate.value?.toString()).toBe('2026-03-14');
    expect(picker.maxDate.value?.toString()).toBe('2026-03-15');
    expect(picker.effectiveMinTime.value).toEqual({ hours: 4, minutes: 30 });
    expect(picker.effectiveMaxTime.value).toEqual({ hours: 15, minutes: 0 });
    model.value = zoned('2026-03-16T14:00[Europe/Vienna]');
    expect(picker.effectiveMinTime.value).toBeNull();
    expect(picker.effectiveMaxTime.value).toBeNull();
  });

  it('changes the value zone preserving wall-clock time, without clamping', () => {
    const { picker, model, props } = createPicker(zoned('2026-03-14T10:30[Europe/Vienna]'));
    props.min = zoned('2026-03-14T09:00Z[UTC]');
    picker.changeValueTimezone('Asia/Tokyo');
    expect(model.value?.toString()).toBe('2026-03-14T10:30:00+09:00[Asia/Tokyo]');
    expect(Temporal.Instant.compare(model.value!.toInstant(), props.min.toInstant())).toBe(-1);
  });

  it('toggles home and location, and returns from a world display to home', () => {
    const { picker } = createPicker(zoned('2026-03-14T10:30[America/New_York]'));
    expect(picker.timezoneIndicatorState.value).toBe('home');
    expect(picker.locationDiffersFromUser.value).toBe(true);
    expect(picker.timeZonesDiffer.value).toBe(true);
    expect(picker.timezoneIndicatorClickable.value).toBe(true);
    picker.toggleDisplayTimezone();
    expect(picker.timezoneIndicatorState.value).toBe('location');
    expect(picker.timeZonesDiffer.value).toBe(false);
    picker.toggleDisplayTimezone();
    expect(picker.timezoneIndicatorState.value).toBe('home');
    picker.selectDisplayTimezone('Asia/Tokyo');
    expect(picker.timezoneIndicatorState.value).toBe('world');
    picker.toggleDisplayTimezone();
    expect(picker.effectiveDisplayTimeZone.value).toBe('Europe/Vienna');
    expect(picker.currentTimeZoneDisplayName.value).toBeTruthy();
    expect(picker.valueTimeZoneLabel.value).toBeTruthy();
  });

  it('does not toggle an empty or home-zone value', () => {
    for (const value of [null, zoned('2026-03-14T10:30[Europe/Vienna]')]) {
      const { picker } = createPicker(value);
      picker.toggleDisplayTimezone();
      expect(picker.timezoneIndicatorClickable.value).toBe(false);
      expect(picker.displayTimeZone.value).toBeNull();
    }
  });

  it('refuses invalid nonempty input on blur, leaving the model alone', () => {
    const { picker, model } = createPicker(zoned('2026-03-14T10:30[Europe/Vienna]'));
    picker.changeInput('incomplete');
    expect(picker.displayValue.value).toBe('incomplete');
    picker.blurInput();
    expect(picker.displayValue.value).toBe('incomplete');
    expect(picker.refused.value).toBe(true);
    picker.changeInput('30.02.2026 10:30');
    picker.blurInput();
    expect(picker.refused.value).toBe(true);
    expect(model.value?.toString()).toBe('2026-03-14T10:30:00+01:00[Europe/Vienna]');
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

  it('commits typed input without rounding or clamping, and navigates in the display zone', async () => {
    const { picker, props, model } = createPicker();
    props.timeZone = 'America/New_York';
    props.max = zoned('2026-03-14T00:00Z[UTC]');
    picker.changeInput('31.03.2026 23:17');
    // Typed in Vienna, where the field shows it; stored in the default zone.
    expect(model.value?.toString()).toBe('2026-03-31T17:17:00-04:00[America/New_York]');
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
    await nextTick();
    expect(picker.displayValue.value).toBe('31.03.2026 23:17');
  });

  it('reacts to external values and home zone changes without moving activeMonth', async () => {
    const { picker, model } = createPicker();
    model.value = zoned('2026-06-14T10:30[Europe/Vienna]');
    await nextTick();
    expect(picker.displayValue.value).toBe('14.06.2026 10:30');
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
    homeZone.value = 'Asia/Tokyo';
    await nextTick();
    expect(picker.displayValue.value).toBe('14.06.2026 17:30');
  });

  it('keeps the existing display watcher dependencies when format options change', async () => {
    const { picker, props } = createPicker(zoned('2026-03-14T14:30[Europe/Vienna]'));
    props.use24Hour = false;
    await nextTick();
    expect(picker.displayValue.value).toBe('14.03.2026 14:30');
    expect(picker.formatValue(zoned('2026-03-14T14:30[Europe/Vienna]'))).toBe('14.03.2026 02:30\u00a0PM');
    expect(picker.inputPlaceholder.value).toBe('DD.MM.YYYY HH:MM AM/PM');
    props.placeholder = 'Choose a date';
    expect(picker.inputPlaceholder.value).toBe('Choose a date');
    props.use24Hour = 'auto';
    props.locale = 'en-US';
    expect(picker.effectiveUse24Hour.value).toBe(false);
    props.locale = 'de-DE';
    expect(picker.effectiveUse24Hour.value).toBe(true);
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
