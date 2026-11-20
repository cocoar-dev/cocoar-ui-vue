import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { DirectiveBinding } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimePickerPanel from '../CoarZonedDateTimePickerPanel.vue';

const log: string[] = [];
const bindings = new Map<string, unknown>();

vi.mock('../../../scrollbar', async (importActual) => ({
  ...(await importActual<typeof import('../../../scrollbar')>()),
  vScrollbar: {
    mounted: (el: HTMLElement, binding: DirectiveBinding) => {
      bindings.set(el.className, binding.value);
    },
  },
  getScrollbarInstance: () => ({ sleep: (sleeping: boolean) => log.push(`sleep ${sleeping}`) }),
}));

vi.mock('../../../icon/CoarIcon.vue', () => ({
  default: { name: 'CoarIcon', props: ['name', 'size'], template: '<span class="mock-icon" />' },
}));

function mountPanel() {
  return mount(CoarZonedDateTimePickerPanel, {
    props: {
      modelValue: Temporal.PlainDate.from('2026-03-14'),
      activeMonth: Temporal.PlainYearMonth.from('2026-03'),
      min: null,
      max: null,
      locale: 'en-US',
      dateFormatConfig: { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
      showWeekNumbers: false,
      highlightWeekends: false,
      markers: [],
      showTodayMonthButton: false,
      selectedTime: { hours: 10, minutes: 30 },
      use24Hour: true,
      minuteStep: 1,
      effectiveMinTime: null,
      effectiveMaxTime: null,
      effectiveDisplayTimeZone: 'Europe/Vienna',
      valueTimeZone: 'Europe/Vienna',
      allTimezones: ['America/New_York', 'Asia/Tokyo', 'Europe/London', 'Europe/Vienna'],
      timezoneFilter: [],
      valueTimeZoneLabel: 'Europe/Vienna',
      timeZonesDiffer: false,
      hasValue: true,
      formatValueInValueTz: '',
      onDateSelected: () => {},
      onActiveMonthChanged: () => {},
      onSelectMonth: () => {},
      onPreviousYear: () => {},
      onNextYear: () => {},
      onScrollToTodayMonth: () => {},
      onTimeChanged: () => {},
      onSelectDisplayTimezone: () => {},
      onChangeValueTimezone: () => {},
    },
    global: {
      provide: { 'coar-l10n': undefined },
      stubs: { CoarScrollableCalendar: true, CoarTimePicker: true, CoarSelect: true },
    },
    attachTo: document.body,
  });
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

describe('CoarZonedDateTimePickerPanel display time zone list', () => {
  afterEach(() => {
    log.length = 0;
    bindings.clear();
    vi.restoreAllMocks();
  });

  it('opens at the active zone without showing its scrollbar for a moment', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
      log.push(`scrollIntoView ${this.querySelector('.coar-zdtp-tz-picker-item-city')?.textContent}`);
    });
    const wrapper = mountPanel();

    await wrapper.find('.coar-zdtp-display-tz-btn').trigger('click');
    await nextTick();
    await nextFrame();

    // The scrollbar exists from the mount, so the opening scroll finds it ...
    expect(bindings.get('coar-zdtp-tz-picker-list')).toMatchObject({ defer: false });
    // ... and OverlayScrollbars sleeps through it: the scroll events do not show the scrollbar.
    expect(log).toEqual(['sleep true', 'scrollIntoView Vienna', 'sleep false']);
    wrapper.unmount();
  });
});
