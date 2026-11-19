import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';

import CoarScrollableCalendar from '../CoarScrollableCalendar.vue';
import { getScrollbarInstance } from '../../../scrollbar';
import calendarSource from '../CoarScrollableCalendar.vue?raw';

vi.mock('../../../scrollbar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../scrollbar')>()),
  getScrollbarInstance: vi.fn(() => null),
}));

// Mock scrollIntoView since happy-dom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

/**
 * The calendar attaches to `document.body` and schedules `requestAnimationFrame`
 * in three places, tearing it down in `onBeforeUnmount` — which never ran here,
 * because nothing unmounted. Eleven live calendars accumulated across the file,
 * each still scheduling frames against a DOM that kept growing. Locally every
 * test stayed near 200ms; on a loaded CI runner the LAST test of the file was
 * the one that blew vitest's 5s default, twice in a row.
 */
const mounted: { unmount: () => void }[] = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.unmount();
});

function mountCalendar(props: Record<string, unknown> = {}) {
  const wrapper = mount(CoarScrollableCalendar, {
    props: {
      ...props,
    },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}

describe('CoarScrollableCalendar', () => {
  describe('rendering', () => {
    it('renders weekday headers', () => {
      const wrapper = mountCalendar();
      const weekdays = wrapper.findAll('.coar-scrollable-calendar__weekday');
      expect(weekdays.length).toBe(7);
    });

    it('opens with three months before and after the active month', () => {
      // Few enough to lay out fast when a picker opens; the infinite loading adds the rest.
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      const months = wrapper.findAll('.coar-scrollable-calendar__month').map((m) => m.attributes('data-year-month'));
      expect(months).toEqual(['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);
    });

    it('renders month names and years', () => {
      const wrapper = mountCalendar();
      const monthNames = wrapper.findAll('.coar-scrollable-calendar__month-name');
      expect(monthNames.length).toBeGreaterThan(0);
      expect(monthNames[0].text()).toBeTruthy();
    });

    it('renders 42 day cells per month (6 rows × 7 cols)', () => {
      const wrapper = mountCalendar();
      const firstMonth = wrapper.find('.coar-scrollable-calendar__month');
      const days = firstMonth.findAll('.coar-scrollable-calendar__day');
      expect(days.length).toBe(42);
    });
  });

  describe('week numbers', () => {
    it('shows week number column when showWeekNumbers is true', () => {
      const wrapper = mountCalendar({ showWeekNumbers: true });
      const weekNumbers = wrapper.findAll('.coar-scrollable-calendar__week-number');
      expect(weekNumbers.length).toBeGreaterThan(0);
    });

    it('hides week numbers by default', () => {
      const wrapper = mountCalendar();
      const weekNumbers = wrapper.findAll('.coar-scrollable-calendar__week-number');
      expect(weekNumbers.length).toBe(0);
    });

    it('adds with-weeks class to grid when showing week numbers', () => {
      const wrapper = mountCalendar({ showWeekNumbers: true });
      expect(wrapper.find('.coar-scrollable-calendar__grid--with-weeks').exists()).toBe(true);
    });
  });

  describe('date selection', () => {
    it('emits dateSelected when clicking a day', async () => {
      const wrapper = mountCalendar();
      const dayButton = wrapper.find('.coar-scrollable-calendar__day:not([disabled])');
      await dayButton.trigger('click');
      expect(wrapper.emitted('dateSelected')).toBeTruthy();
    });

    it('marks selected date', async () => {
      const selectedDate = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        modelValue: selectedDate,
        activeMonth: selectedDate.toPlainYearMonth(),
      });
      await nextTick();

      const selectedDay = wrapper.find('.coar-scrollable-calendar__day--selected');
      expect(selectedDay.exists()).toBe(true);
      expect(selectedDay.attributes('data-date')).toBe('2025-07-15');
    });

    it('does not select disabled dates', async () => {
      const minDate = Temporal.PlainDate.from('2025-07-10');
      const wrapper = mountCalendar({
        min: minDate,
        activeMonth: minDate.toPlainYearMonth(),
      });

      // Find a disabled day (before min)
      const disabledDay = wrapper.find('.coar-scrollable-calendar__day--disabled');
      if (disabledDay.exists()) {
        await disabledDay.trigger('click');
        expect(wrapper.emitted('dateSelected')).toBeUndefined();
      }
    });
  });

  describe('today highlighting', () => {
    it('marks today with special class', () => {
      const wrapper = mountCalendar();
      const todayEl = wrapper.find('.coar-scrollable-calendar__day--today');
      expect(todayEl.exists()).toBe(true);
    });

    it('today has aria-current="date"', () => {
      const wrapper = mountCalendar();
      const todayEl = wrapper.find('[aria-current="date"]');
      expect(todayEl.exists()).toBe(true);
    });
  });

  describe('min/max constraints', () => {
    it('disables dates before min', () => {
      const min = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        min,
        activeMonth: min.toPlainYearMonth(),
      });

      const disabledDays = wrapper.findAll('.coar-scrollable-calendar__day--disabled');
      expect(disabledDays.length).toBeGreaterThan(0);
    });

    it('disables dates after max', () => {
      const max = Temporal.PlainDate.from('2025-07-15');
      const wrapper = mountCalendar({
        max,
        activeMonth: max.toPlainYearMonth(),
      });

      const disabledDays = wrapper.findAll('.coar-scrollable-calendar__day--disabled');
      expect(disabledDays.length).toBeGreaterThan(0);
    });
  });

  describe('markers', () => {
    it('highlights marked dates', () => {
      const markers = [
        {
          startDate: Temporal.PlainDate.from('2025-07-04'),
          description: 'Holiday',
        },
      ];
      const wrapper = mountCalendar({
        markers,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const markedDay = wrapper.find('.coar-scrollable-calendar__day--marked');
      expect(markedDay.exists()).toBe(true);
    });
  });

  describe('weekend highlighting', () => {
    it('marks weekend days when highlightWeekends is true', () => {
      const wrapper = mountCalendar({
        highlightWeekends: true,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const weekendDays = wrapper.findAll('.coar-scrollable-calendar__day--weekend');
      expect(weekendDays.length).toBeGreaterThan(0);
    });

    it('does not mark weekends when highlightWeekends is false', () => {
      const wrapper = mountCalendar({
        highlightWeekends: false,
        activeMonth: Temporal.PlainYearMonth.from('2025-07'),
      });

      const weekendDays = wrapper.findAll('.coar-scrollable-calendar__day--weekend');
      expect(weekendDays.length).toBe(0);
    });
  });

  const MONTH_HEIGHT = 267;
  const PICKER_VIEWPORT_HEIGHT = 312;
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const restores: (() => void)[] = [];

  function ownerOf(proto: object, key: string): object {
    let owner: object | null = proto;
    while (owner && !Object.getOwnPropertyDescriptor(owner, key)) owner = Object.getPrototypeOf(owner);
    return owner!;
  }

  /**
   * A layout of months of equal height in a viewport whose height can change (0: no layout,
   * as under display: none, where every offset is 0). Like a browser, it keeps scrollTop
   * within [0, scrollHeight - clientHeight], also when the viewport grows. With `anchors`, the browser keeps the
   * month at the viewport top in place when months are added or removed above it, as
   * Chromium's scroll anchoring does at the next layout; WebKit does not. `log` records the
   * scrollTop set on the viewport or on the months container, except the probes
   * OverlayScrollbars makes while it wraps the months (0, and beyond either end).
   */
  function fakeLayout(options: { viewportHeight?: number; anchors?: boolean; log?: string[] } = {}) {
    const state = { viewportHeight: options.viewportHeight ?? PICKER_VIEWPORT_HEIGHT };
    let scrollTop = 0;
    let laidOut: string[] = [];
    const isViewport = (el: Element) => el.hasAttribute('data-overlayscrollbars-viewport');
    const viewportOf = (el: Element) => el.closest('[data-overlayscrollbars-viewport]');
    const layout = (viewport: Element): string[] => {
      const months = Array.from(viewport.querySelectorAll('[data-year-month]'), (m) => m.getAttribute('data-year-month')!);
      if (options.anchors && laidOut.length > 0 && months.join() !== laidOut.join()) {
        const top = laidOut[Math.floor(scrollTop / MONTH_HEIGHT)];
        if (months.includes(top)) scrollTop += (months.indexOf(top) - laidOut.indexOf(top)) * MONTH_HEIGHT;
      }
      laidOut = months;
      if (state.viewportHeight > 0) scrollTop = Math.min(scrollTop, maxScrollTop());
      return months;
    };
    const maxScrollTop = () => Math.max(0, laidOut.length * MONTH_HEIGHT - state.viewportHeight);
    const monthTop = (month: HTMLElement) =>
      state.viewportHeight === 0 ? 0 : layout(viewportOf(month)!).indexOf(month.getAttribute('data-year-month')!) * MONTH_HEIGHT;
    const isMonth = (el: HTMLElement) => el.hasAttribute('data-year-month') && !!viewportOf(el);

    const override = (key: string, descriptor: (original: PropertyDescriptor) => PropertyDescriptor) => {
      const owner = ownerOf(HTMLElement.prototype, key);
      const original = Object.getOwnPropertyDescriptor(owner, key)!;
      Object.defineProperty(owner, key, { ...descriptor(original), configurable: true });
      restores.push(() => Object.defineProperty(owner, key, original));
    };
    override('getBoundingClientRect', (original) => ({
      value(this: HTMLElement): DOMRect {
        if (isViewport(this)) {
          layout(this);
          return { top: 0, bottom: state.viewportHeight, height: state.viewportHeight } as DOMRect;
        }
        if (isMonth(this)) {
          const top = state.viewportHeight === 0 ? 0 : monthTop(this) - scrollTop;
          const height = state.viewportHeight === 0 ? 0 : MONTH_HEIGHT;
          return { top, bottom: top + height, height } as DOMRect;
        }
        return original.value.call(this);
      },
    }));
    override('offsetTop', (original) => ({
      get(this: HTMLElement) {
        return isMonth(this) ? monthTop(this) : original.get!.call(this);
      },
    }));
    override('offsetHeight', (original) => ({
      get(this: HTMLElement) {
        if (!isMonth(this)) return original.get!.call(this);
        return state.viewportHeight === 0 ? 0 : MONTH_HEIGHT;
      },
    }));
    override('scrollHeight', (original) => ({
      get(this: HTMLElement) {
        if (!isViewport(this)) return original.get!.call(this);
        return state.viewportHeight === 0 ? 0 : layout(this).length * MONTH_HEIGHT;
      },
    }));
    override('clientHeight', (original) => ({
      get(this: HTMLElement) {
        return isViewport(this) ? state.viewportHeight : original.get!.call(this);
      },
    }));
    override('scrollTop', (original) => ({
      get(this: HTMLElement) {
        if (!isViewport(this)) return original.get!.call(this);
        layout(this);
        return scrollTop;
      },
      set(this: HTMLElement, value: number) {
        const height = state.viewportHeight === 0 ? 0 : laidOut.length * MONTH_HEIGHT;
        const isProbe = value <= 0 || (height > 0 && value >= height);
        const log = isProbe ? undefined : options.log;
        if (this.classList.contains('coar-scrollable-calendar__months')) log?.push(`scrollTop ${value} on container`);
        if (!isViewport(this)) return original.set!.call(this, value);
        log?.push(`scrollTop ${value} on viewport`);
        layout(this);
        scrollTop = state.viewportHeight === 0 ? 0 : Math.max(0, Math.min(value, maxScrollTop()));
      },
    }));
    return state;
  }

  afterEach(() => {
    while (restores.length > 0) restores.pop()!();
    vi.unstubAllGlobals();
    vi.mocked(getScrollbarInstance).mockReset().mockReturnValue(null);
  });

  function isRevealed(wrapper: ReturnType<typeof mountCalendar>): boolean {
    return wrapper
      .find('.coar-scrollable-calendar__months-wrapper')
      .classes()
      .includes('coar-scrollable-calendar__months-wrapper--ready');
  }

  function monthsOf(wrapper: ReturnType<typeof mountCalendar>): string[] {
    return wrapper.findAll('.coar-scrollable-calendar__month').map((m) => m.attributes('data-year-month')!);
  }

  /** Lets a positioning run to its end: DOM updates for added months, the scroll, its frame. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (let i = 0; i < 3; i++) await nextTick();
    await frame();
    await nextTick();
    await frame();
  };

  /** Where a month's top lies relative to the viewport's top (0: at the top). */
  function topOf(wrapper: ReturnType<typeof mountCalendar>, yearMonth: string): number {
    return wrapper.find(`[data-year-month="${yearMonth}"]`).element.getBoundingClientRect().top;
  }

  /**
   * A ResizeObserver the test drives: `resized()` calls every observer still connected, as
   * the browser does when a size changes.
   */
  function stubResizeObserver() {
    const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn>; connected: boolean }[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record;
        constructor(callback: () => void) {
          this.record = { callback, disconnect: vi.fn(() => { this.record.connected = false; }), connected: true };
          observers.push(this.record);
        }
        disconnect() {
          this.record.disconnect();
        }
        observe() {}
        unobserve() {}
      },
    );
    const resized = () => {
      for (const observer of observers) if (observer.connected) observer.callback();
    };
    return Object.assign(observers, { resized });
  }

  describe('opening position', () => {
    it('positions the list once, in the OverlayScrollbars viewport, and reveals it after', async () => {
      const log: string[] = [];
      fakeLayout({ log });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      expect(isRevealed(wrapper)).toBe(false);

      await settle();

      // Measured after OverlayScrollbars wrapped the months; a position given to the
      // container before would be carried into the viewport or measured on another layout.
      expect(log).toEqual([`scrollTop ${3 * MONTH_HEIGHT} on viewport`]);
      expect(isRevealed(wrapper)).toBe(true);
      // A picker's calendar covers its viewport with the months it opens with.
      expect(monthsOf(wrapper)).toHaveLength(7);
    });

    it('keeps OverlayScrollbars asleep while it positions the list at opening', async () => {
      const log: string[] = [];
      fakeLayout({ log });
      vi.mocked(getScrollbarInstance).mockReturnValue({
        sleep: (sleeping: boolean) => log.push(`sleep ${sleeping}`),
      } as unknown as ReturnType<typeof getScrollbarInstance>);
      mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });

      await settle();

      // Awake, it would take the scroll for a user's and show the scrollbar for a moment.
      expect(log).toEqual(['sleep true', `scrollTop ${3 * MONTH_HEIGHT} on viewport`, 'sleep false']);
    });

    /** Asleep once, before every scroll of the calendar, and awake again only after the last. */
    function expectQuiet(log: string[]) {
      expect(log.filter((entry) => entry.startsWith('sleep'))).toEqual(['sleep true', 'sleep false']);
      const scrolls = log.map((entry, i) => (entry.startsWith('scrollTop') ? i : -1)).filter((i) => i >= 0);
      expect(scrolls.length).toBeGreaterThan(0);
      expect(log.indexOf('sleep true')).toBeLessThan(scrolls[0]);
      expect(log.indexOf('sleep false')).toBeGreaterThan(scrolls.at(-1)!);
    }

    it('keeps OverlayScrollbars asleep while it adds months to a viewport that grew', async () => {
      const observers = stubResizeObserver();
      const log: string[] = [];
      const layout = fakeLayout({ viewportHeight: 360, log });
      vi.mocked(getScrollbarInstance).mockReturnValue({
        sleep: (sleeping: boolean) => log.push(`sleep ${sleeping}`),
      } as unknown as ReturnType<typeof getScrollbarInstance>);
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();
      log.length = 0;

      // The viewport grows by itself (a font loads, a panel opens): the months are no user's scroll.
      layout.viewportHeight = 1400;
      observers.resized();
      await settle();

      expect(topOf(wrapper, '2026-03')).toBe(0);
      expectQuiet(log);
    });

    it('wakes OverlayScrollbars only after the last of overlapping scrolls of its own', async () => {
      const observers = stubResizeObserver();
      const log: string[] = [];
      const layout = fakeLayout({ viewportHeight: 360, log });
      vi.mocked(getScrollbarInstance).mockReturnValue({
        sleep: (sleeping: boolean) => log.push(`sleep ${sleeping}`),
      } as unknown as ReturnType<typeof getScrollbarInstance>);
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      // The opening scroll is applied, its frame has not run yet: the viewport grows then.
      await vi.waitUntil(() => log.some((entry) => entry.startsWith('scrollTop')));
      layout.viewportHeight = 1400;
      observers.resized();
      await settle();

      // Only the scrollbar: where the list ends after this race is a matter of its own.
      expect(wrapper.find('[data-overlayscrollbars-viewport]').exists()).toBe(true);
      expectQuiet(log);
    });

    it('waits for a layout when it is mounted hidden, then positions the list once', async () => {
      const observers = stubResizeObserver();
      const log: string[] = [];
      const layout = fakeLayout({ viewportHeight: 0, log });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();
      // Under display: none every month measures offsetTop 0: no position, still hidden.
      expect(log).toEqual([]);
      expect(isRevealed(wrapper)).toBe(false);
      expect(observers).toHaveLength(1);

      layout.viewportHeight = PICKER_VIEWPORT_HEIGHT;
      observers.resized();
      await settle();

      expect(log).toEqual([`scrollTop ${3 * MONTH_HEIGHT} on viewport`]);
      expect(isRevealed(wrapper)).toBe(true);
      // It goes on observing: a viewport that grows later may need more months.
      expect(observers[0].disconnect).not.toHaveBeenCalled();
    });

    it('stops observing the viewport when it is unmounted, also hidden', async () => {
      const observers = stubResizeObserver();
      fakeLayout({ viewportHeight: 0 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();

      wrapper.unmount();
      mounted.splice(mounted.indexOf(wrapper), 1);

      expect(observers[0].disconnect).toHaveBeenCalled();
    });

    it('adds months until a tall calendar is covered, and reaches the month at the top', async () => {
      fakeLayout({ viewportHeight: 1372 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();

      // From March on, 1372 + 500 px are needed: four months of 267 px more than the opened four.
      expect(monthsOf(wrapper).at(-1)).toBe('2026-10');
      expect(topOf(wrapper, '2026-03')).toBe(0);
      expect(isRevealed(wrapper)).toBe(true);
    });

    it('covers a tall calendar beyond max, with the days there disabled, and reaches the month', async () => {
      fakeLayout({ viewportHeight: 1372 });
      const wrapper = mountCalendar({
        activeMonth: Temporal.PlainYearMonth.from('2026-03'),
        max: Temporal.PlainDate.from('2026-06-30'),
      });
      await settle();

      expect(topOf(wrapper, '2026-03')).toBe(0);
      expect(monthsOf(wrapper).at(-1)).toBe('2026-10');
      expect(wrapper.find('[data-date="2026-07-01"]').attributes('disabled')).toBeDefined();
    });

    it('positions a tall calendar anyway when MAX_MONTHS_IN_DOM cannot cover it', async () => {
      fakeLayout({ viewportHeight: 10000 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();

      expect(monthsOf(wrapper)).toHaveLength(25);
      expect(isRevealed(wrapper)).toBe(true);
    });

    it('reaches a later month navigated to in a tall calendar', async () => {
      fakeLayout({ viewportHeight: 1372 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();

      await wrapper.setProps({ activeMonth: Temporal.PlainYearMonth.from('2026-06') });
      await settle();

      expect(topOf(wrapper, '2026-06')).toBe(0);
    });

    it.each([
      ['reports the resize first (Chromium)', false],
      ['dispatches the scroll of the clamped position first (WebKit)', true],
    ])('keeps the month at the top when the viewport grows, in a browser that %s', async (_, scrollFirst) => {
      const observers = stubResizeObserver();
      const layout = fakeLayout({ viewportHeight: 360 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      const viewport = wrapper.find('[data-overlayscrollbars-viewport]').element as HTMLElement;
      await settle();
      expect(topOf(wrapper, '2026-03')).toBe(0);

      // 1400 px do not fit below March in the opened months: the browser clamps scrollTop.
      layout.viewportHeight = 1400;
      if (scrollFirst) viewport.dispatchEvent(new Event('scroll'));
      observers.resized();
      await settle();

      expect(topOf(wrapper, '2026-03')).toBe(0);
    });

    it('reaches the month when a hidden calendar is shown small first, then grows', async () => {
      const observers = stubResizeObserver();
      const layout = fakeLayout({ viewportHeight: 0 });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();

      layout.viewportHeight = 40;
      observers.resized();
      await settle();
      layout.viewportHeight = 1400;
      observers.resized();
      await settle();

      expect(topOf(wrapper, '2026-03')).toBe(0);
      expect(isRevealed(wrapper)).toBe(true);
    });

    it('lays every month out instead of estimating the size of months not yet rendered', () => {
      // content-visibility: auto gave months away from the viewport an estimated height, so
      // the active month's offsetTop measured at opening moved once the months above it were
      // rendered: on a slow device the list opened scrolled past the month heading. Happy-dom
      // has no layout, so the style rule itself is what this test can hold on to.
      const monthRule = calendarSource.match(/\.coar-scrollable-calendar__month \{[^}]*\}/)?.[0];
      expect(monthRule).toBeDefined();
      expect(monthRule).not.toMatch(/content-visibility|contain-intrinsic-size|min-width/);
    });
  });

  describe('infinite loading', () => {
    it.each([
      ['anchors the scroll position itself (Chromium)', true],
      ['does not (WebKit)', false],
    ])('keeps the month at the top in place when earlier months load, in a browser that %s', async (_, anchors) => {
      fakeLayout({ anchors });
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await settle();
      const viewport = wrapper.find('[data-overlayscrollbars-viewport]').element as HTMLElement;
      const topOf = (yearMonth: string) =>
        wrapper.find(`[data-year-month="${yearMonth}"]`).element.getBoundingClientRect().top;

      // Scrolled up to 33 px into January 2026: closer than 500 px to the first month.
      viewport.scrollTop = MONTH_HEIGHT + 33;
      viewport.dispatchEvent(new Event('scroll'));
      await nextTick();
      await frame();
      await nextTick();

      expect(monthsOf(wrapper)[0]).toBe('2025-06');
      expect(topOf('2026-01')).toBe(-33);
    });

    it.each([
      ['max', { max: Temporal.PlainDate.from('2026-06-20') }, 'down', '2026-06'],
      ['min', { min: Temporal.PlainDate.from('2025-12-05') }, 'up', '2025-12'],
    ] as const)('loads no month beyond %s', async (_, limit, direction, edge) => {
      fakeLayout();
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03'), ...limit });
      await settle();
      const viewport = wrapper.find('[data-overlayscrollbars-viewport]').element as HTMLElement;

      viewport.scrollTop = direction === 'down' ? 7 * MONTH_HEIGHT - PICKER_VIEWPORT_HEIGHT : 0;
      viewport.dispatchEvent(new Event('scroll'));
      await nextTick();
      await frame();

      const months = monthsOf(wrapper);
      expect(months).toHaveLength(7);
      expect(months[direction === 'down' ? 6 : 0]).toBe(edge);
    });

    it('gives a month navigated to near the edge the same months around it as at opening', async () => {
      const wrapper = mountCalendar({ activeMonth: Temporal.PlainYearMonth.from('2026-03') });
      await wrapper.setProps({ activeMonth: Temporal.PlainYearMonth.from('2026-01') });
      await settle();
      const months = monthsOf(wrapper);
      // Three before January, so that positioning it leaves the top edge beyond the loading threshold.
      expect(months[0]).toBe('2025-10');
      expect(months.at(-1)).toBe('2026-06');
    });
  });

  describe('accessibility', () => {
    it('day cells are buttons', () => {
      const wrapper = mountCalendar();
      const firstDay = wrapper.find('.coar-scrollable-calendar__day');
      expect(firstDay.element.tagName).toBe('BUTTON');
    });

    it('grid has role="grid"', () => {
      const wrapper = mountCalendar();
      const grid = wrapper.find('[role="grid"]');
      expect(grid.exists()).toBe(true);
    });

    it('focused day has tabindex 0', async () => {
      const wrapper = mountCalendar();
      await nextTick();
      const focusedDay = wrapper.find('.coar-scrollable-calendar__day--focused');
      expect(focusedDay.exists()).toBe(true);
      expect(focusedDay.attributes('tabindex')).toBe('0');
    });
  });
});
