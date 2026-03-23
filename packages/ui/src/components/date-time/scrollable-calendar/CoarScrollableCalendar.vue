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

import { vScrollbar } from '../../scrollbar';
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
const MONTHS_BEFORE = 12;
const MONTHS_AFTER = 12;
const MONTHS_TO_LOAD = 6;
const MAX_MONTHS_IN_DOM = 25;

const earliestMonth = ref<Temporal.PlainYearMonth>(
  Temporal.Now.plainDateISO().toPlainYearMonth().subtract({ months: MONTHS_BEFORE }),
);
const latestMonth = ref<Temporal.PlainYearMonth>(
  Temporal.Now.plainDateISO().toPlainYearMonth().add({ months: MONTHS_AFTER }),
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

  if (smooth) {
    viewport.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    setTimeout(() => {
      isScrollingProgrammatically = false;
      isScrollPositioned.value = true;
    }, 500);
  } else {
    viewport.scrollTop = el.offsetTop;
    requestAnimationFrame(() => {
      isScrollingProgrammatically = false;
      isScrollPositioned.value = true;
    });
  }
}

function ensureMonthInRange(targetMonth: Temporal.PlainYearMonth): void {
  let changed = false;
  if (Temporal.PlainYearMonth.compare(targetMonth, earliestMonth.value) < 0) {
    const diff = (earliestMonth.value.year - targetMonth.year) * 12 + (earliestMonth.value.month - targetMonth.month);
    earliestMonth.value = earliestMonth.value.subtract({ months: diff + 3 });
    changed = true;
  }
  if (Temporal.PlainYearMonth.compare(targetMonth, latestMonth.value) > 0) {
    const diff = (targetMonth.year - latestMonth.value.year) * 12 + (targetMonth.month - latestMonth.value.month);
    latestMonth.value = latestMonth.value.add({ months: diff + 3 });
    changed = true;
  }
  if (changed) rebuildMonths();
}

// Watch activeMonth for external navigation (e.g., MonthList clicks)
watch(activeMonth, (month) => {
  if (isUpdatingFromScroll) return;
  ensureMonthInRange(month);
  nextTick(() => scrollToMonth(month, false));
});

function onScroll(): void {
  if (isScrollingProgrammatically) return;

  const container = scrollContainerRef.value;
  if (!container) return;

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
  const threshold = 500;

  const minMonth = props.min?.toPlainYearMonth() ?? null;
  const maxMonth = props.max?.toPlainYearMonth() ?? null;

  if (scrollTop < threshold) {
    const canLoad = !minMonth || Temporal.PlainYearMonth.compare(earliestMonth.value, minMonth) > 0;
    if (canLoad) loadEarlierMonths();
  }

  if (scrollHeight - scrollTop - clientHeight < threshold) {
    const canLoad = !maxMonth || Temporal.PlainYearMonth.compare(latestMonth.value, maxMonth) < 0;
    if (canLoad) loadLaterMonths();
  }
}

function loadEarlierMonths(): void {
  if (isLoadingMonths) return;
  isLoadingMonths = true;

  const viewport = getScrollViewport();
  const scrollHeightBefore = viewport?.scrollHeight ?? 0;

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

  earliestMonth.value = current;
  months.value = [...newMonths, ...months.value];
  trimMonthsFromEnd();

  requestAnimationFrame(() => {
    if (viewport) {
      const addedHeight = viewport.scrollHeight - scrollHeightBefore;
      viewport.scrollTop += addedHeight;
    }
    isLoadingMonths = false;
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

  latestMonth.value = current;
  months.value = [...months.value, ...newMonths];
  trimMonthsFromBeginning();

  requestAnimationFrame(() => { isLoadingMonths = false; });
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
        scrollToMonth(targetMonth, false);
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
      ensureMonthInRange(today.value.toPlainYearMonth());
      nextTick(() => scrollToMonth(today.value.toPlainYearMonth(), false));
      break;
  }
}

// Initialize focused date
watch(modelValue, (val) => {
  if (val && !focusedDate.value) focusedDate.value = val;
}, { immediate: true });

if (!focusedDate.value) focusedDate.value = today.value;

// Mount: scroll to active month immediately (works with native overflow-y:auto
// before OverlayScrollbars takes over), then observe for the OverlayScrollbars
// viewport element to appear and attach the scroll listener to it.
let scrollListenerTarget: HTMLElement | null = null;
let viewportObserver: MutationObserver | null = null;

function attachScrollListener(): void {
  const viewport = getScrollViewport();
  if (viewport && viewport !== scrollListenerTarget) {
    scrollListenerTarget?.removeEventListener('scroll', onScroll);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    scrollListenerTarget = viewport;
    // Re-scroll now that the OS viewport is ready; the earlier setTimeout call
    // targeted the container element (OS not yet init'd), producing an offset.
    scrollToMonth(activeMonth.value, false);
  }
}

onMounted(() => {
  // Defer initial scroll to after layout
  setTimeout(() => scrollToMonth(activeMonth.value, false), 0);

  const container = scrollContainerRef.value;
  if (!container) return;

  // If OverlayScrollbars viewport already exists (sync init), attach immediately
  if (container.querySelector('[data-overlayscrollbars-viewport]')) {
    attachScrollListener();
  } else {
    // Wait for OverlayScrollbars to create the viewport via requestIdleCallback
    viewportObserver = new MutationObserver(() => {
      if (container.querySelector('[data-overlayscrollbars-viewport]')) {
        viewportObserver!.disconnect();
        viewportObserver = null;
        attachScrollListener();
      }
    });
    viewportObserver.observe(container, { childList: true });
  }
});

onBeforeUnmount(() => {
  viewportObserver?.disconnect();
  viewportObserver = null;
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
        v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave' }"
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

.coar-scrollable-calendar__month {
  padding-top: var(--coar-spacing-m);
  content-visibility: auto;
  contain-intrinsic-size: auto 260px;
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
  min-height: 32px;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-component-xs-font-size);
  color: var(--coar-text-neutral-tertiary);
  opacity: 0.6;
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
  min-height: 32px;
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
  opacity: 0.5;
}

.coar-scrollable-calendar__day--today:not(.coar-scrollable-calendar__day--selected) {
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-accent-primary);
}

.coar-scrollable-calendar__day--selected {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
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
  background: var(--coar-text-on-bold);
}

/* ========================================
   FOCUS RING (keyboard navigation)
   ======================================== */

.coar-scrollable-calendar__day--focused:not(.coar-scrollable-calendar__day--selected) {
  outline: 2px solid var(--coar-border-accent-primary);
  outline-offset: -2px;
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
