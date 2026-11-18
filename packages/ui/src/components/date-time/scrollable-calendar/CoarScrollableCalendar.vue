<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { useL10n } from '@cocoar/vue-localization';

import { vScrollbar, getScrollbarInstance } from '../../scrollbar';
import type { CoarDateMarker, DateFormatConfig } from '../_shared/types';
import {
  coarCalculateIsoWeekNumber,
  coarClampPlainDate,
  coarDetectDateFormatPatternFromIntl,
  coarDetectFirstDayOfWeekFromLocale,
  coarGetCalendarGridDates,
  coarGetLocalizedWeekdays,
} from '../_shared/date-helpers';

/** A single day cell in the rendered calendar */
export interface CoarCalendarDay {
  readonly date: Temporal.PlainDate;
  readonly day: number;
  readonly isOutsideMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isFocused: boolean;
  readonly isDisabled: boolean;
  readonly isWeekend: boolean;
  readonly markers: CoarDateMarker[];
  readonly markerCssClass: string;
}

/** A rendered month block */
export interface CoarCalendarMonth {
  readonly yearMonth: Temporal.PlainYearMonth;
  readonly monthName: string;
  readonly year: number;
  readonly days: CoarCalendarDay[];
  readonly weekNumbers: number[];
}

/** Weekday header item */
interface WeekdayHeader {
  readonly name: string;
  readonly isWeekend: boolean;
}

const props = withDefaults(
  defineProps<{
    /** Minimum selectable date */
    min?: Temporal.PlainDate | null;
    /** Maximum selectable date */
    max?: Temporal.PlainDate | null;
    /** Locale for display */
    locale?: string;
    /** Date format config (pattern + firstDayOfWeek) */
    dateFormatConfig?: DateFormatConfig;
    /** Show week numbers column */
    showWeekNumbers?: boolean;
    /** Highlight weekend columns */
    highlightWeekends?: boolean;
    /** Date markers for special dates */
    markers?: CoarDateMarker[];
  }>(),
  {
    min: null,
    max: null,
    locale: undefined,
    dateFormatConfig: undefined,
    showWeekNumbers: false,
    highlightWeekends: false,
    markers: () => [],
  },
);

const modelValue = defineModel<Temporal.PlainDate | null>({ default: null });
const activeMonth = defineModel<Temporal.PlainYearMonth>('activeMonth', {
  default: () => Temporal.Now.plainDateISO().toPlainYearMonth(),
});

const emit = defineEmits<{
  dateSelected: [date: Temporal.PlainDate];
}>();

// Localization
const l10n = useL10n();
const effectiveLocale = computed(() => props.locale ?? l10n?.language.value ?? navigator.language);

const effectiveDateFormat = computed((): DateFormatConfig => {
  if (props.dateFormatConfig) return props.dateFormatConfig;
  const detected = coarDetectDateFormatPatternFromIntl(effectiveLocale.value);
  const firstDayOfWeek = coarDetectFirstDayOfWeekFromLocale(effectiveLocale.value);
  return { pattern: detected ?? 'dd.mm.yyyy', firstDayOfWeek };
});

const firstDayOfWeek = computed(() => effectiveDateFormat.value.firstDayOfWeek);

const today = computed(() => Temporal.Now.plainDateISO());

// Weekday headers
const weekdayHeaders = computed((): WeekdayHeader[] => {
  const names = coarGetLocalizedWeekdays(effectiveLocale.value, firstDayOfWeek.value);
  const fd = firstDayOfWeek.value;
  return names.map((name, index) => {
    let isoDayOfWeek: number;
    if (fd === 1) {
      isoDayOfWeek = index + 1;
    } else {
      isoDayOfWeek = index === 0 ? 7 : index;
    }
    return { name, isWeekend: isoDayOfWeek === 6 || isoDayOfWeek === 7 };
  });
});

// Month range management
const MONTHS_BEFORE = 3;
const MONTHS_AFTER = 3;
const MONTHS_TO_LOAD = 6;
const MAX_MONTHS_IN_DOM = 25;
/** Distance to an edge of the list, in px, below which more months load. */
const LOAD_THRESHOLD = 500;

const earliestMonth = ref<Temporal.PlainYearMonth>(
  activeMonth.value.subtract({ months: MONTHS_BEFORE }),
);
const latestMonth = ref<Temporal.PlainYearMonth>(
  activeMonth.value.add({ months: MONTHS_AFTER }),
);

// Focused date for keyboard nav
const focusedDate = ref<Temporal.PlainDate | null>(null);

// Scroll state
const scrollContainerRef = ref<HTMLElement | null>(null);
const isScrollPositioned = ref(false);
let isScrollingProgrammatically = false;
let isUpdatingFromScroll = false;
let isLoadingMonths = false;

/**
 * Returns the actual scrolling element — the OverlayScrollbars viewport if present,
 * otherwise falls back to the container itself.
 */
function getScrollViewport(): HTMLElement | null {
  const container = scrollContainerRef.value;
  if (!container) return null;
  return (container.querySelector('[data-overlayscrollbars-viewport]') as HTMLElement) ?? container;
}

// ============================================================
// Month generation
// ============================================================

function isDateDisabled(date: Temporal.PlainDate): boolean {
  if (props.min && Temporal.PlainDate.compare(date, props.min) < 0) return true;
  if (props.max && Temporal.PlainDate.compare(date, props.max) > 0) return true;
  return false;
}

function createCalendarDay(date: Temporal.PlainDate, isOutsideMonth: boolean): CoarCalendarDay {
  const sel = modelValue.value;
  const foc = focusedDate.value;
  const dow = date.dayOfWeek;

  const dateMarkers = props.markers.filter((marker) => {
    const afterStart = Temporal.PlainDate.compare(date, marker.startDate) >= 0;
    const beforeEnd = marker.endDate
      ? Temporal.PlainDate.compare(date, marker.endDate) <= 0
      : Temporal.PlainDate.compare(date, marker.startDate) === 0;
    return afterStart && beforeEnd;
  });

  return {
    date,
    day: date.day,
    isOutsideMonth,
    isToday: Temporal.PlainDate.compare(date, today.value) === 0,
    isSelected: sel ? Temporal.PlainDate.compare(date, sel) === 0 : false,
    isFocused: foc ? Temporal.PlainDate.compare(date, foc) === 0 : false,
    isDisabled: isDateDisabled(date),
    isWeekend: dow === 6 || dow === 7,
    markers: dateMarkers,
    markerCssClass: dateMarkers.length > 0 ? (dateMarkers[0].cssClass ?? '') : '',
  };
}

function createCalendarMonth(yearMonth: Temporal.PlainYearMonth): CoarCalendarMonth {
  const locale = effectiveLocale.value;
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
    new Date(yearMonth.year, yearMonth.month - 1, 1),
  );

  const gridCells = coarGetCalendarGridDates(yearMonth, firstDayOfWeek.value);
  const days = gridCells.map((cell) => createCalendarDay(cell.date, cell.isOutsideMonth));

  const weekNumbers: number[] = [];
  for (let row = 0; row < 6; row++) {
    weekNumbers.push(coarCalculateIsoWeekNumber(gridCells[row * 7].date));
  }

  return { yearMonth, monthName, year: yearMonth.year, days, weekNumbers };
}

function buildAllMonths(): CoarCalendarMonth[] {
  const result: CoarCalendarMonth[] = [];
  let current = earliestMonth.value;
  while (Temporal.PlainYearMonth.compare(current, latestMonth.value) <= 0) {
    result.push(createCalendarMonth(current));
    current = current.add({ months: 1 });
  }
  return result;
}

const months = ref<CoarCalendarMonth[]>(buildAllMonths());

function rebuildMonths(): void {
  months.value = buildAllMonths();
}

// Rebuild when relevant state changes
watch(
  [modelValue, focusedDate, () => props.markers, () => props.min, () => props.max, () => props.highlightWeekends, effectiveLocale],
  () => {
    if (months.value.length > 0) rebuildMonths();
  },
);

// ============================================================
// Scroll management
// ============================================================

function getMonthElementId(ym: Temporal.PlainYearMonth): string {
  return `month-${ym.year}-${ym.month}`;
}

function scrollToMonth(targetMonth: Temporal.PlainYearMonth, smooth = false): void {
  const container = scrollContainerRef.value;
  if (!container) return;

  const monthId = getMonthElementId(targetMonth);
  const el = container.querySelector(`#${monthId}`) as HTMLElement | null;
  if (!el) return;

  isScrollingProgrammatically = true;

  const viewport = getScrollViewport() ?? container;
  const finish = (): void => {
    isScrollingProgrammatically = false;
    isScrollPositioned.value = true;
    restingTop = topMonth(viewport);
    if (isCoverPending) coverAfterGrowing(viewport);
  };

  if (smooth) {
    viewport.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    setTimeout(finish, 500);
  } else {
    viewport.scrollTop = el.offsetTop;
    requestAnimationFrame(finish);
  }
}

/**
 * Gives the month navigated to the same months around it as the opened one, so that positioning
 * it leaves both edges of the list beyond the threshold of the infinite loading.
 */
function ensureMonthInRange(targetMonth: Temporal.PlainYearMonth): boolean {
  const from = targetMonth.subtract({ months: MONTHS_BEFORE });
  const to = targetMonth.add({ months: MONTHS_AFTER });
  let changed = false;
  if (Temporal.PlainYearMonth.compare(from, earliestMonth.value) < 0) {
    earliestMonth.value = from;
    changed = true;
  }
  if (Temporal.PlainYearMonth.compare(to, latestMonth.value) > 0) {
    latestMonth.value = to;
    changed = true;
  }
  if (changed) rebuildMonths();
  return changed;
}

/** The month at the top of the viewport, and where its top lies relative to the viewport's. */
interface TopMonth {
  readonly element: HTMLElement;
  readonly offset: number;
}

function topMonth(viewport: HTMLElement): TopMonth | undefined {
  const viewportTop = viewport.getBoundingClientRect().top;
  const element = Array.from(viewport.querySelectorAll<HTMLElement>('[data-year-month]')).find(
    (el) => el.getBoundingClientRect().bottom > viewportTop,
  );
  return element && { element, offset: element.getBoundingClientRect().top - viewportTop };
}

/**
 * The top month when the list last came to rest: after a programmatic scroll, a user's scroll
 * or a change of months. A viewport that grows can make the browser clamp the scroll position
 * before the ResizeObserver reports it; this is where the list was before.
 */
let restingTop: TopMonth | undefined;

/** The viewport height the ResizeObserver last reported. */
let observedHeight = 0;

/**
 * Adds months where the list does not reach beyond the viewport and the loading threshold
 * around `target` (a tall calendar), capped by MAX_MONTHS_IN_DOM only: like the opening
 * range, these months may lie beyond min and max, with their days disabled; only the
 * infinite loading stops at min and max. Returns whether it added any.
 */
function extendToCover(viewport: HTMLElement, target: HTMLElement): boolean {
  const monthHeight = target.offsetHeight;
  if (monthHeight === 0) return false;
  const room = Math.max(0, MAX_MONTHS_IN_DOM - months.value.length);
  const missingAfter = viewport.clientHeight + LOAD_THRESHOLD - (viewport.scrollHeight - target.offsetTop);
  const missingBefore = LOAD_THRESHOLD - target.offsetTop;
  const later = Math.min(Math.max(0, Math.ceil(missingAfter / monthHeight)), room);
  const earlier = Math.min(Math.max(0, Math.ceil(missingBefore / monthHeight)), room - later);
  if (later === 0 && earlier === 0) return false;
  latestMonth.value = latestMonth.value.add({ months: later });
  earliestMonth.value = earliestMonth.value.subtract({ months: earlier });
  rebuildMonths();
  return true;
}

/**
 * The one way the list is positioned by the component: the months around `month` are made to
 * cover the viewport, the DOM updates if months were added, then `month` is scrolled to the
 * top. At opening the scroll is not taken for a user's (see onMounted).
 */
function positionAt(month: Temporal.PlainYearMonth, opening = false): void {
  if (ensureMonthInRange(month)) {
    nextTick(() => positionAt(month, opening));
    return;
  }
  const viewport = getScrollViewport();
  const target = viewport?.querySelector<HTMLElement>(`#${getMonthElementId(month)}`);
  if (viewport && target && extendToCover(viewport, target)) {
    nextTick(() => positionAt(month, opening));
    return;
  }
  if (!opening) {
    scrollToMonth(month, false);
    return;
  }
  // The opening position is no user scroll: asleep, OverlayScrollbars ignores its scroll
  // event instead of showing the scrollbar for a moment. That event is dispatched before
  // the animation frame callbacks of the frame that follows, so it is past at the wake-up.
  const scrollbars = getScrollbarInstance(scrollContainerRef.value!);
  scrollbars?.sleep(true);
  scrollToMonth(month, false);
  requestAnimationFrame(() => scrollbars?.sleep(false));
}

// Watch activeMonth for external navigation (e.g., MonthList clicks)
watch(activeMonth, (month) => {
  if (isUpdatingFromScroll) return;
  nextTick(() => positionAt(month));
});

function onScroll(): void {
  if (isScrollingProgrammatically) return;

  const container = scrollContainerRef.value;
  if (!container) return;
  const viewport = getScrollViewport();
  // A resize the ResizeObserver has not reported yet (WebKit dispatches the scroll event of
  // the clamped position first): not a scroll of the user's; the observer handles it.
  if (viewport && viewport.clientHeight !== observedHeight) return;
  if (viewport && !isLoadingMonths && !isCoverPending) restingTop = topMonth(viewport);

  // Find most visible month
  const monthElements = container.querySelectorAll('[data-year-month]');
  const containerRect = container.getBoundingClientRect();
  let mostVisible: Temporal.PlainYearMonth | null = null;
  let maxArea = 0;

  for (const el of monthElements) {
    const rect = el.getBoundingClientRect();
    const visTop = Math.max(rect.top, containerRect.top);
    const visBot = Math.min(rect.bottom, containerRect.bottom);
    const area = Math.max(0, visBot - visTop);
    if (area > maxArea) {
      maxArea = area;
      const attr = el.getAttribute('data-year-month');
      if (attr) mostVisible = Temporal.PlainYearMonth.from(attr);
    }
  }

  if (mostVisible && !mostVisible.equals(activeMonth.value)) {
    isUpdatingFromScroll = true;
    activeMonth.value = mostVisible;
    queueMicrotask(() => { isUpdatingFromScroll = false; });
  }

  // Infinite scroll check
  checkInfiniteScroll();
}

function checkInfiniteScroll(): void {
  if (isLoadingMonths || isScrollingProgrammatically) return;
  const viewport = getScrollViewport();
  if (!viewport) return;

  const { scrollTop, scrollHeight, clientHeight } = viewport;

  const minMonth = props.min?.toPlainYearMonth() ?? null;
  const maxMonth = props.max?.toPlainYearMonth() ?? null;

  if (scrollTop < LOAD_THRESHOLD) {
    const canLoad = !minMonth || Temporal.PlainYearMonth.compare(earliestMonth.value, minMonth) > 0;
    if (canLoad) loadEarlierMonths();
  }

  if (scrollHeight - scrollTop - clientHeight < LOAD_THRESHOLD) {
    const canLoad = !maxMonth || Temporal.PlainYearMonth.compare(latestMonth.value, maxMonth) < 0;
    if (canLoad) loadLaterMonths();
  }
}

/**
 * Changes the months around the visible ones and keeps the month at the top of the viewport
 * where it was (measured now, or given): corrected right after the DOM update, before the
 * browser paints. A browser that anchored the scroll position itself (Chromium) leaves
 * nothing to correct; one that does not (WebKit) is corrected by the full height added or
 * removed above.
 */
function keepTopMonthInPlace(change: () => void, kept?: TopMonth): void {
  const viewport = getScrollViewport();
  const anchor = kept ?? (viewport ? topMonth(viewport) : undefined);

  change();

  nextTick(() => {
    if (viewport && anchor?.element.isConnected) {
      const offset = anchor.element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      viewport.scrollTop += offset - anchor.offset;
    }
    if (viewport) restingTop = topMonth(viewport);
    requestAnimationFrame(() => {
      isLoadingMonths = false;
      if (isCoverPending && viewport) coverAfterGrowing(viewport);
    });
  });
}

function loadEarlierMonths(): void {
  if (isLoadingMonths) return;
  isLoadingMonths = true;

  const minMonth = props.min?.toPlainYearMonth() ?? null;
  let current = earliestMonth.value;
  const newMonths: CoarCalendarMonth[] = [];

  for (let i = 0; i < MONTHS_TO_LOAD; i++) {
    const prev = current.subtract({ months: 1 });
    if (minMonth && Temporal.PlainYearMonth.compare(prev, minMonth) < 0) break;
    current = prev;
    newMonths.unshift(createCalendarMonth(current));
  }

  if (newMonths.length === 0) { isLoadingMonths = false; return; }

  keepTopMonthInPlace(() => {
    earliestMonth.value = current;
    months.value = [...newMonths, ...months.value];
    trimMonthsFromEnd();
  });
}

function loadLaterMonths(): void {
  if (isLoadingMonths) return;
  isLoadingMonths = true;

  const maxMonth = props.max?.toPlainYearMonth() ?? null;
  let current = latestMonth.value;
  const newMonths: CoarCalendarMonth[] = [];

  for (let i = 0; i < MONTHS_TO_LOAD; i++) {
    const next = current.add({ months: 1 });
    if (maxMonth && Temporal.PlainYearMonth.compare(next, maxMonth) > 0) break;
    current = next;
    newMonths.push(createCalendarMonth(current));
  }

  if (newMonths.length === 0) { isLoadingMonths = false; return; }

  // Trimming removes months above the visible ones.
  keepTopMonthInPlace(() => {
    latestMonth.value = current;
    months.value = [...months.value, ...newMonths];
    trimMonthsFromBeginning();
  });
}

function trimMonthsFromEnd(): void {
  const current = months.value;
  if (current.length <= MAX_MONTHS_IN_DOM) return;
  const trimmed = current.slice(0, MAX_MONTHS_IN_DOM);
  months.value = trimmed;
  latestMonth.value = trimmed[trimmed.length - 1].yearMonth;
}

function trimMonthsFromBeginning(): void {
  const current = months.value;
  if (current.length <= MAX_MONTHS_IN_DOM) return;
  const trimCount = current.length - MAX_MONTHS_IN_DOM;
  const trimmed = current.slice(trimCount);
  months.value = trimmed;
  earliestMonth.value = trimmed[0].yearMonth;
}

// ============================================================
// Date selection & keyboard navigation
// ============================================================

function selectDate(date: Temporal.PlainDate): void {
  if (isDateDisabled(date)) return;
  modelValue.value = date;
  focusedDate.value = date;
  emit('dateSelected', date);
}

function moveFocus(amount: number, unit: 'day' | 'month' | 'year'): void {
  const current = focusedDate.value ?? modelValue.value ?? today.value;
  let newDate: Temporal.PlainDate;

  switch (unit) {
    case 'day':
      newDate = current.add({ days: amount });
      break;
    case 'month':
      newDate = current.add({ months: amount });
      break;
    case 'year':
      newDate = current.add({ years: amount });
      break;
  }

  newDate = coarClampPlainDate(newDate, { min: props.min, max: props.max });
  focusedDate.value = newDate;

  // Scroll to the focused date's month if needed
  const targetMonth = newDate.toPlainYearMonth();
  ensureMonthInRange(targetMonth);
  nextTick(() => {
    const container = scrollContainerRef.value;
    if (!container) return;
    const btn = container.querySelector(`button[data-date="${newDate.toString()}"]`) as HTMLElement | null;
    btn?.focus();

    const monthId = getMonthElementId(targetMonth);
    const monthEl = container.querySelector(`#${monthId}`) as HTMLElement | null;
    if (monthEl) {
      const containerRect = container.getBoundingClientRect();
      const monthRect = monthEl.getBoundingClientRect();
      if (monthRect.bottom < containerRect.top || monthRect.top > containerRect.bottom) {
        positionAt(targetMonth);
      }
    }
  });
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'Enter':
    case ' ': {
      event.preventDefault();
      if (focusedDate.value) selectDate(focusedDate.value);
      break;
    }
    case 'ArrowLeft':
      event.preventDefault();
      moveFocus(-1, 'day');
      break;
    case 'ArrowRight':
      event.preventDefault();
      moveFocus(1, 'day');
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveFocus(-7, 'day');
      break;
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(7, 'day');
      break;
    case 'PageUp':
      event.preventDefault();
      moveFocus(event.shiftKey ? -1 : -1, event.shiftKey ? 'year' : 'month');
      break;
    case 'PageDown':
      event.preventDefault();
      moveFocus(event.shiftKey ? 1 : 1, event.shiftKey ? 'year' : 'month');
      break;
    case 'Home':
      event.preventDefault();
      focusedDate.value = today.value;
      positionAt(today.value.toPlainYearMonth());
      break;
  }
}

// Initialize focused date
watch(modelValue, (val) => {
  if (val && !focusedDate.value) focusedDate.value = val;
}, { immediate: true });

if (!focusedDate.value) focusedDate.value = today.value;

// Mount: OverlayScrollbars is initialised synchronously (defer: false in the template),
// so its viewport, the element that scrolls, exists here. The list is positioned once it
// has a layout, and stays hidden until then.
let scrollListenerTarget: HTMLElement | null = null;
let sizeObserver: ResizeObserver | null = null;
let isCoverPending = false;

/**
 * The viewport grew after the list was positioned: months are added where they no longer
 * cover it, around the month that was at the top, which goes back to where it was. Until the opening position
 * is reached, and while a programmatic scroll or a load runs, this waits for it to finish.
 */
function coverAfterGrowing(viewport: HTMLElement): void {
  isCoverPending = !isScrollPositioned.value || isScrollingProgrammatically || isLoadingMonths;
  if (isCoverPending) return;
  const top = restingTop?.element.isConnected ? restingTop : topMonth(viewport);
  if (!top) return;
  isLoadingMonths = true;
  keepTopMonthInPlace(() => extendToCover(viewport, top.element), top);
}

onMounted(() => {
  const viewport = getScrollViewport();
  if (!viewport) return;
  viewport.addEventListener('scroll', onScroll, { passive: true });
  scrollListenerTarget = viewport;

  // Mounted without a layout (a parent with display: none, a closed tab), every month
  // measures offsetTop 0: the opening waits for the viewport to get a size.
  let isOpening = false;
  observedHeight = viewport.clientHeight;
  const open = () => {
    isOpening = true;
    positionAt(activeMonth.value, true);
  };
  if (observedHeight > 0) open();
  sizeObserver = new ResizeObserver(() => {
    const grew = viewport.clientHeight > observedHeight;
    observedHeight = viewport.clientHeight;
    if (observedHeight === 0) return;
    if (!isOpening) open();
    else if (grew) coverAfterGrowing(viewport);
  });
  sizeObserver.observe(viewport);
});

onBeforeUnmount(() => {
  sizeObserver?.disconnect();
  sizeObserver = null;
  if (scrollListenerTarget) {
    scrollListenerTarget.removeEventListener('scroll', onScroll);
    scrollListenerTarget = null;
  }
});
</script>

<template>
  <div class="coar-scrollable-calendar" @keydown="onKeydown">
    <!-- Weekday headers -->
    <div
      class="coar-scrollable-calendar__weekdays"
      :class="{ 'coar-scrollable-calendar__weekdays--with-weeks': showWeekNumbers }"
    >
      <span v-if="showWeekNumbers" class="coar-scrollable-calendar__week-spacer" />
      <span
        v-for="header in weekdayHeaders"
        :key="header.name"
        class="coar-scrollable-calendar__weekday"
        :class="{ 'coar-scrollable-calendar__weekday--weekend': highlightWeekends && header.isWeekend }"
      >
        {{ header.name }}
      </span>
    </div>

    <!-- Scrollable months container -->
    <div
      class="coar-scrollable-calendar__months-wrapper"
      :class="{ 'coar-scrollable-calendar__months-wrapper--ready': isScrollPositioned }"
    >
      <div
        ref="scrollContainerRef"
        v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave', defer: false }"
        class="coar-scrollable-calendar__months"
      >
        <div
          v-for="month in months"
          :id="getMonthElementId(month.yearMonth)"
          :key="month.yearMonth.toString()"
          :data-year-month="month.yearMonth.toString()"
          class="coar-scrollable-calendar__month"
        >
          <!-- Month header -->
          <div
            class="coar-scrollable-calendar__month-header"
            :class="{ 'coar-scrollable-calendar__month-header--with-weeks': showWeekNumbers }"
          >
            <span class="coar-scrollable-calendar__month-name">{{ month.monthName }}</span>
            <span class="coar-scrollable-calendar__month-year">{{ month.year }}</span>
          </div>

          <!-- Days grid -->
          <div
            class="coar-scrollable-calendar__grid"
            :class="{ 'coar-scrollable-calendar__grid--with-weeks': showWeekNumbers }"
            role="grid"
          >
            <template v-for="(day, i) in month.days" :key="day.date.toString()">
              <span v-if="showWeekNumbers && i % 7 === 0" class="coar-scrollable-calendar__week-number">
                {{ month.weekNumbers[i / 7] }}
              </span>

              <button
                type="button"
                class="coar-scrollable-calendar__day"
                :class="[
                  day.markerCssClass,
                  {
                    'coar-scrollable-calendar__day--outside': day.isOutsideMonth,
                    'coar-scrollable-calendar__day--today': day.isToday,
                    'coar-scrollable-calendar__day--selected': day.isSelected,
                    'coar-scrollable-calendar__day--focused': day.isFocused,
                    'coar-scrollable-calendar__day--disabled': day.isDisabled,
                    'coar-scrollable-calendar__day--weekend': highlightWeekends && day.isWeekend,
                    'coar-scrollable-calendar__day--marked': day.markers.length > 0,
                  },
                ]"
                :disabled="day.isDisabled"
                :tabindex="day.isFocused ? 0 : -1"
                :data-date="day.date.toString()"
                :aria-selected="day.isSelected"
                :aria-current="day.isToday ? 'date' : undefined"
                @click="selectDate(day.date)"
              >
                {{ day.day }}
              </button>
            </template>
          </div>
        </div>
        <div class="coar-scrollable-calendar__intrinsic-width" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   COAR SCROLLABLE CALENDAR COMPONENT
   ======================================== */

.coar-scrollable-calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 280px;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
}

/* ========================================
   WEEKDAY HEADERS
   ======================================== */

.coar-scrollable-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  background: var(--coar-background-neutral-primary);
  flex-shrink: 0;
}

.coar-scrollable-calendar__weekdays--with-weeks {
  grid-template-columns: 32px repeat(7, 1fr);
}

.coar-scrollable-calendar__weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-secondary);
  text-transform: uppercase;
}

.coar-scrollable-calendar__weekday--weekend {
  background: var(--coar-background-neutral-secondary);
}

/* ========================================
   SCROLLABLE MONTHS CONTAINER
   ======================================== */

.coar-scrollable-calendar__months-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
  visibility: hidden;
}

.coar-scrollable-calendar__months-wrapper--ready {
  visibility: visible;
}

.coar-scrollable-calendar__months-wrapper::before,
.coar-scrollable-calendar__months-wrapper::after {
  content: '';
  position: absolute;
  left: 0;
  right: 10px;
  height: 28px;
  pointer-events: none;
  z-index: 5;
}

.coar-scrollable-calendar__months-wrapper::before {
  top: 0;
  background: linear-gradient(
    to bottom,
    var(--coar-background-neutral-primary) 20%,
    transparent 100%
  );
}

.coar-scrollable-calendar__months-wrapper::after {
  bottom: 0;
  background: linear-gradient(to top, var(--coar-background-neutral-primary) 0%, transparent 100%);
}

.coar-scrollable-calendar__months {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none; /* prevent native scrollbar flash before OverlayScrollbars init */
  padding: 0 var(--coar-spacing-m) var(--coar-spacing-m);
}

.coar-scrollable-calendar__months::-webkit-scrollbar {
  display: none; /* prevent native scrollbar flash in WebKit browsers */
}

/* ========================================
   MONTH BLOCK
   ======================================== */

/* No content-visibility: auto. A month not yet rendered took an estimated size, so the
   active month's offsetTop measured at opening changed once the months above it were
   laid out, and on a slow device the list opened scrolled past the month heading.
   Kept from it: the containment of a rendered month. */
.coar-scrollable-calendar__month {
  padding-top: var(--coar-spacing-m);
  contain: layout style paint;
}

/* The width the estimate of a month not yet rendered gave a calendar that sizes to its
   content (a picker panel): 260px, an intrinsic size only. Where the calendar has a width,
   this element fills it like the months and the weekday header, and moves nothing. */
.coar-scrollable-calendar__intrinsic-width {
  contain: size;
  contain-intrinsic-size: 260px 0;
}

.coar-scrollable-calendar__month-header {
  display: flex;
  align-items: baseline;
  gap: var(--coar-spacing-xs);
  padding-bottom: var(--coar-spacing-xs);
}

.coar-scrollable-calendar__month-header--with-weeks {
  padding-left: 32px;
}

.coar-scrollable-calendar__month-name {
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-bold-weight);
  color: var(--coar-text-neutral-primary);
}

.coar-scrollable-calendar__month-year {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-secondary);
}

/* ========================================
   DAYS GRID
   ======================================== */

.coar-scrollable-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.coar-scrollable-calendar__grid--with-weeks {
  position: relative;
  grid-template-columns: 32px repeat(7, 1fr);
}

.coar-scrollable-calendar__grid--with-weeks::before {
  content: '';
  position: absolute;
  left: 30px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--coar-border-neutral-secondary);
  opacity: 0.15;
}

.coar-scrollable-calendar__week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--coar-picker-day-min-height, 32px);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-component-xs-font-size);
  color: var(--coar-text-neutral-tertiary);
  opacity: var(--coar-picker-context-opacity, 0.6);
}

/* ========================================
   DAY BUTTON
   ======================================== */

.coar-scrollable-calendar__day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  min-height: var(--coar-picker-day-min-height, 32px);
  padding: 2px;
  border: none;
  border-radius: 0;
  background: transparent;
  background-clip: content-box;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  outline: none;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-scrollable-calendar__day:hover:not(:disabled):not(.coar-scrollable-calendar__day--selected) {
  background: var(--coar-background-neutral-secondary);
}

.coar-scrollable-calendar__day--outside {
  color: var(--coar-text-neutral-tertiary);
  opacity: var(--coar-picker-context-opacity, 0.5);
}

.coar-scrollable-calendar__day--today:not(.coar-scrollable-calendar__day--selected) {
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-accent-primary);
}

.coar-scrollable-calendar__day--selected {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-accent, var(--coar-text-on-bold));
  font-weight: var(--coar-body-small-bold-weight);
}

.coar-scrollable-calendar__day--selected:hover {
  background: var(--coar-background-accent-hover);
}

.coar-scrollable-calendar__day--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-scrollable-calendar__day--disabled:hover {
  background: transparent;
}

.coar-scrollable-calendar__day--weekend {
  background: var(--coar-background-neutral-secondary);
}

.coar-scrollable-calendar__day--weekend:hover:not(:disabled):not(
    .coar-scrollable-calendar__day--selected
  ) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-scrollable-calendar__day--weekend.coar-scrollable-calendar__day--selected {
  background: var(--coar-background-accent-primary);
}

.coar-scrollable-calendar__day--weekend.coar-scrollable-calendar__day--selected:hover {
  background: var(--coar-background-accent-hover);
}

.coar-scrollable-calendar__day--marked {
  position: relative;
  overflow: visible;
}

.coar-scrollable-calendar__day--marked::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--coar-text-accent-primary);
  z-index: 1;
}

.coar-scrollable-calendar__day--marked.coar-scrollable-calendar__day--selected::after {
  background: var(--coar-text-on-accent, var(--coar-text-on-bold));
}

/* ========================================
   FOCUS RING (keyboard navigation)
   ======================================== */

.coar-scrollable-calendar__day--focused:not(.coar-scrollable-calendar__day--selected) {
  outline: 2px solid var(--coar-border-accent-primary);
  outline-offset: -2px;
}

/* A theme that sets the day's focus ring width draws the shared focus ring on the
   focused day, selected or not; without it the rules above stand. */
.coar-scrollable-calendar__day:focus-visible {
  --coar-i-day-focus-outline: var(--coar-picker-day-focus-outline-width) var(--coar-focus-style) var(--coar-focus-color);
  outline: var(--coar-i-day-focus-outline, none);
  outline-offset: var(--coar-picker-day-focus-outline-offset, 0px);
}
.coar-scrollable-calendar__day--focused:not(.coar-scrollable-calendar__day--selected):focus-visible {
  outline: var(--coar-i-day-focus-outline, 2px solid var(--coar-border-accent-primary));
}

/* ========================================
   REDUCED MOTION
   ======================================== */

@media (prefers-reduced-motion: reduce) {
  .coar-scrollable-calendar__day {
    transition: none;
  }
}
</style>
