import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimePickerPanel from '../CoarZonedDateTimePickerPanel.vue';
import { getScrollbarInstance } from '../../../scrollbar';

vi.mock('../../../scrollbar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../scrollbar')>()),
  vScrollbar: { mounted() {}, updated() {}, unmounted() {} },
  getScrollbarInstance: vi.fn(() => null),
}));

vi.mock('@cocoar/vue-localization', () => ({
  useI18n: () => ({ t: (_key: string, _params: unknown, fallback?: string) => fallback ?? _key }),
}));

const stub = { template: '<div />' };
const noop = () => {};

function mountPanel() {
  return mount(CoarZonedDateTimePickerPanel, {
    props: {
      modelValue: Temporal.PlainDate.from('2026-03-14'),
      activeMonth: Temporal.PlainYearMonth.from('2026-03'),
      min: null,
      max: null,
      locale: 'en-US',
      dateFormatConfig: { pattern: 'dd.MM.yyyy', placeholder: 'dd.mm.yyyy' } as never,
      showWeekNumbers: false,
      highlightWeekends: false,
      markers: [],
      showTodayMonthButton: false,
      selectedTime: null,
      use24Hour: true,
      minuteStep: 5,
      effectiveMinTime: null,
      effectiveMaxTime: null,
      effectiveDisplayTimeZone: 'UTC',
      valueTimeZone: 'UTC',
      allTimezones: ['Europe/Vienna', 'UTC', 'Pacific/Auckland'],
      timezoneFilter: [],
      valueTimeZoneLabel: 'UTC',
      timeZonesDiffer: false,
      hasValue: true,
      formatValueInValueTz: '',
      onDateSelected: noop,
      onActiveMonthChanged: noop,
      onSelectMonth: noop,
      onPreviousYear: noop,
      onNextYear: noop,
      onScrollToTodayMonth: noop,
      onTimeChanged: noop,
      onSelectDisplayTimezone: noop,
      onChangeValueTimezone: noop,
    },
    global: {
      stubs: { CoarScrollableCalendar: stub, CoarTimePicker: stub, CoarSelect: stub, CoarIcon: stub },
    },
    attachTo: document.body,
  });
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('CoarZonedDateTimePickerPanel time zone list', () => {
  it('scrolls to the active zone without waking its scrollbar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    const log: string[] = [];
    vi.mocked(getScrollbarInstance).mockReturnValue({
      sleep: (sleeping: boolean) => log.push(`sleep ${sleeping}`),
    } as unknown as ReturnType<typeof getScrollbarInstance>);
    const scrollIntoView = vi.fn(() => log.push('scrollIntoView'));
    Element.prototype.scrollIntoView = scrollIntoView;
    const wrapper = mountPanel();

    await wrapper.find('.coar-zdtp-display-tz-btn').trigger('click');
    await nextTick();
    vi.advanceTimersByTime(50);
    expect(log).toEqual(['sleep true', 'scrollIntoView']);
    expect(scrollIntoView.mock.contexts[0]).toHaveProperty('classList');

    // Awake again in the frame after the scroll.
    vi.advanceTimersToNextFrame();
    expect(log).toEqual(['sleep true', 'scrollIntoView', 'sleep false']);
    wrapper.unmount();
  });

  it('does not fail when the list closed before its scroll, or has no scrollbar yet', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });
    vi.mocked(getScrollbarInstance).mockReturnValue(null);
    Element.prototype.scrollIntoView = vi.fn();
    const wrapper = mountPanel();

    await wrapper.find('.coar-zdtp-display-tz-btn').trigger('click');
    await nextTick();
    expect(() => vi.advanceTimersByTime(50)).not.toThrow();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce();

    await wrapper.find('.coar-zdtp-tz-search-close').trigger('click');
    await wrapper.find('.coar-zdtp-display-tz-btn').trigger('click');
    await wrapper.find('.coar-zdtp-tz-search-close').trigger('click');
    expect(() => vi.advanceTimersByTime(50)).not.toThrow();
    wrapper.unmount();
  });
});
