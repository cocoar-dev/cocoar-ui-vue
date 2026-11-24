import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { usePlainDatePicker } from '../use-plain-date-picker';
import type { DateFormatConfig } from '../types';

vi.mock('@cocoar/vue-localization', () => ({
  useL10n: () => ({ language: ref('en-GB'), localeData: ref(null) }),
  useTimezone: () => ({ timezone: ref('Europe/Vienna') }),
}));

const scopes: EffectScope[] = [];
const date = (value: string) => Temporal.PlainDate.from(value);

function createPicker(value: Temporal.PlainDate | null = null) {
  const model = ref<Temporal.PlainDate | null>(value);
  const props = reactive({
    placeholder: '',
    locale: 'en-GB' as string | undefined,
    dateFormat: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as DateFormatConfig | undefined,
    min: null as Temporal.PlainDate | null,
    max: null as Temporal.PlainDate | null,
  });
  const scope = effectScope();
  scopes.push(scope);
  const picker = scope.run(() => usePlainDatePicker(model, props))!;
  return { model, props, picker };
}

beforeEach(() => {
  vi.spyOn(Temporal.Now, 'plainDateISO').mockReturnValue(date('2026-03-10'));
});

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});

describe('usePlainDatePicker', () => {
  it('starts with the value month or today, without opening the presentation', () => {
    expect(createPicker().picker.activeMonth.value.toString()).toBe('2026-03');
    const { picker } = createPicker(date('2025-12-31'));
    expect(picker.activeMonth.value.toString()).toBe('2025-12');
    expect(picker.displayValue.value).toBe('31.12.2025');
    expect(picker.pickerBase.isOpen.value).toBe(false);
  });

  it.each([
    ['dd.mm.yyyy', '14.03.2026', 'DD.MM.YYYY'],
    ['dd/mm/yyyy', '14/03/2026', 'DD/MM/YYYY'],
    ['mm/dd/yyyy', '03/14/2026', 'MM/DD/YYYY'],
    ['yyyy-mm-dd', '2026-03-14', 'YYYY-MM-DD'],
  ] as const)('formats and parses with the pattern %s', async (pattern, text, placeholder) => {
    const { picker, props } = createPicker(date('2026-03-14'));
    props.dateFormat = { pattern, firstDayOfWeek: 1 };
    expect(picker.formatValue(date('2026-03-14'))).toBe(text);
    expect(picker.parseValueFromInput(text)?.toString()).toBe('2026-03-14');
    expect(picker.inputPlaceholder.value).toBe(placeholder);
    // The display follows the model only, as before: a format change alone does not reformat it.
    await nextTick();
    expect(picker.displayValue.value).toBe('14.03.2026');
  });

  it('derives the pattern from the locale without an explicit format', () => {
    const { picker, props } = createPicker();
    props.dateFormat = undefined;
    props.locale = 'de-DE';
    expect(picker.formatValue(date('2026-03-14'))).toBe('14.03.2026');
    props.locale = 'en-US';
    expect(picker.formatValue(date('2026-03-14'))).toBe('03/14/2026');
    expect(picker.parseValueFromInput('03/14/2026')?.toString()).toBe('2026-03-14');
  });

  it('prefers an explicit placeholder', () => {
    const { picker, props } = createPicker();
    props.placeholder = 'Pick a day';
    expect(picker.inputPlaceholder.value).toBe('Pick a day');
  });

  it('returns null for invalid input', () => {
    const { picker } = createPicker();
    for (const text of ['', 'nonsense', '14.03', '31.02.2026', '14/03/2026', '14.13.2026']) {
      expect(picker.parseValueFromInput(text)).toBeNull();
    }
  });

  it('rejects typed dates outside min/max instead of clamping them', () => {
    const { picker, props, model } = createPicker();
    props.min = date('2026-03-05');
    props.max = date('2026-03-20');
    expect(picker.parseValueFromInput('05.03.2026')?.toString()).toBe('2026-03-05');
    expect(picker.parseValueFromInput('20.03.2026')?.toString()).toBe('2026-03-20');
    picker.changeInput('04.03.2026');
    expect(model.value).toBeNull();
    picker.changeInput('21.03.2026');
    expect(model.value).toBeNull();
    picker.blurInput();
    expect(picker.displayValue.value).toBe('21.03.2026');
    expect(picker.refused.value).toBe(true);
  });

  it('refuses an impossible calendar day and keeps the model (#109)', () => {
    const { picker, model } = createPicker(date('2026-03-14'));
    for (const text of ['30.02.2026', '29.02.2026']) {
      picker.changeInput(text);
      picker.blurInput();
      expect(picker.displayValue.value).toBe(text);
      expect(picker.refused.value).toBe(true);
      expect(model.value?.toString()).toBe('2026-03-14');
    }
    picker.changeInput('29.02.2028');
    expect(model.value?.toString()).toBe('2028-02-29');
    expect(picker.refused.value).toBe(false);
  });

  it('selects a date as given, without clamping (the panel limits the choice)', async () => {
    const { picker, props, model } = createPicker();
    props.max = date('2026-03-20');
    picker.selectDate(date('2026-04-02'));
    expect(model.value?.toString()).toBe('2026-04-02');
    await nextTick();
    expect(picker.displayValue.value).toBe('02.04.2026');
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
  });

  it('commits typed input and moves the active month to it', async () => {
    const { picker, model } = createPicker();
    picker.changeInput('14.06.2026');
    expect(picker.displayValue.value).toBe('14.06.2026');
    expect(model.value?.toString()).toBe('2026-06-14');
    expect(picker.activeMonth.value.toString()).toBe('2026-06');
    await nextTick();
    expect(picker.displayValue.value).toBe('14.06.2026');
  });

  it('keeps partial input as refused on blur, and restoreInput brings the value back', () => {
    const { picker, model } = createPicker(date('2026-03-14'));
    picker.changeInput('14.0');
    expect(picker.displayValue.value).toBe('14.0');
    expect(model.value?.toString()).toBe('2026-03-14');
    expect(picker.refused.value).toBe(false);
    picker.blurInput();
    expect(picker.displayValue.value).toBe('14.0');
    expect(picker.refused.value).toBe(true);
    picker.restoreInput();
    expect(picker.displayValue.value).toBe('14.03.2026');
    expect(picker.refused.value).toBe(false);
  });

  it('refuses invalid input without a value, clears the refusal, and leaves empty input alone', () => {
    const { picker } = createPicker();
    picker.changeInput('nonsense');
    picker.blurInput();
    expect(picker.displayValue.value).toBe('nonsense');
    expect(picker.refused.value).toBe(true);
    picker.clearValue();
    expect(picker.refused.value).toBe(false);
    const withValue = createPicker(date('2026-03-14'));
    withValue.picker.changeInput('');
    withValue.picker.blurInput();
    expect(withValue.picker.displayValue.value).toBe('');
    expect(withValue.model.value?.toString()).toBe('2026-03-14');
  });

  it('clears the value and the display', () => {
    const { picker, model } = createPicker(date('2026-03-14'));
    picker.clearValue();
    expect(model.value).toBeNull();
    expect(picker.displayValue.value).toBe('');
  });

  it('reacts to external model changes without moving the active month', async () => {
    const { picker, model } = createPicker();
    model.value = date('2026-06-14');
    await nextTick();
    expect(picker.displayValue.value).toBe('14.06.2026');
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
    model.value = null;
    await nextTick();
    expect(picker.displayValue.value).toBe('');
  });

  it('navigates months and today, guarding the existing year limits', () => {
    const { picker } = createPicker();
    picker.selectMonth(Temporal.PlainYearMonth.from('1926-04'));
    expect(picker.isPrevYearDisabled.value).toBe(true);
    picker.previousYear();
    expect(picker.activeMonth.value.year).toBe(1926);
    picker.nextYear();
    expect(picker.activeMonth.value.year).toBe(1927);
    picker.selectMonth(Temporal.PlainYearMonth.from('2076-04'));
    expect(picker.isNextYearDisabled.value).toBe(true);
    picker.nextYear();
    expect(picker.activeMonth.value.year).toBe(2076);
    picker.previousYear();
    expect(picker.activeMonth.value.year).toBe(2075);
    picker.scrollToTodayMonth();
    expect(picker.activeMonth.value.toString()).toBe('2026-03');
    expect(picker.today.value.toString()).toBe('2026-03-10');
  });
});
