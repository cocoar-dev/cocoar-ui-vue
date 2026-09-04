<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import { Temporal, type CalendarEvent, type MonthCellPill, type MonthMultiDayBar } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';
import CoarMonthView from './CoarMonthView.vue';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();
defineSlots<{
  pill?(props: { event: CalendarEvent<TMeta>; pill: MonthCellPill<TMeta> }): unknown;
  multiDayBar?(props: { event: CalendarEvent<TMeta>; bar: MonthMultiDayBar<TMeta> }): unknown;
}>();

const root = ref<HTMLElement | null>(null);
const localization = useLocalization();
const locale = computed(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);
const shadeWeekends = computed(() => toValue(props.builder.state.shadeWeekends));
const monthFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
);

function yearMonthOf(date: Temporal.PlainDate): Temporal.PlainYearMonth {
  return Temporal.PlainYearMonth.from({ year: date.year, month: date.month });
}
function monthKey(month: Temporal.PlainYearMonth): string {
  return month.toString();
}
function monthRange(
  center: Temporal.PlainYearMonth,
  before = 6,
  after = 6,
): Temporal.PlainYearMonth[] {
  return Array.from({ length: before + after + 1 }, (_, index) =>
    center.add({ months: index - before }),
  );
}
function formatMonth(month: Temporal.PlainYearMonth): string {
  return monthFormatter.value.format(new Date(`${month}-01T00:00:00Z`));
}

const initialMonth = yearMonthOf(props.builder.state.date.value);
const months = ref<Temporal.PlainYearMonth[]>(monthRange(initialMonth));
const MAX_MATERIALIZED_MONTHS = 25;
const activeMonthKey = ref(monthKey(initialMonth));
let frame = 0;
let adjustingMonths = false;
let syncingCursorFromScroll = false;

// One writer covers the current month plus its immediate neighbours. This keeps
// event loaders and recurrence expansion ready before either neighbour scrolls in.
useViewWindow(props.builder, { view: 'month', monthBuffer: 1 });

function sectionElement(key: string): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>(`[data-month-key="${key}"]`) ?? null;
}

function alignMonthToTop(key: string, behavior: ScrollBehavior = 'auto'): void {
  const container = root.value;
  const section = sectionElement(key);
  if (!container || !section) return;
  const delta = section.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: container.scrollTop + delta, behavior });
}

async function ensureMonthAndAlign(
  target: Temporal.PlainYearMonth,
  behavior: ScrollBehavior,
): Promise<void> {
  const key = monthKey(target);
  if (!months.value.some((month) => monthKey(month) === key)) {
    adjustingMonths = true;
    months.value = monthRange(target);
    await nextTick();
  }
  alignMonthToTop(key, behavior);
  activeMonthKey.value = key;
  requestAnimationFrame(() => {
    adjustingMonths = false;
  });
}

function updateCursorFromViewport(): void {
  const container = root.value;
  if (!container || adjustingMonths) return;
  const containerTop = container.getBoundingClientRect().top;
  const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-month-key]'));
  if (sections.length === 0) return;
  // iOS keeps the topmost visible month active until the following month's
  // section itself reaches the top; it does not switch at the visual midpoint.
  let active = sections[0];
  for (const candidate of sections) {
    if (candidate.getBoundingClientRect().top <= containerTop + 1) active = candidate;
    else break;
  }
  const key = active.dataset.monthKey;
  if (!key || key === activeMonthKey.value) return;
  activeMonthKey.value = key;
  const nextMonth = Temporal.PlainYearMonth.from(key);
  const current = props.builder.state.date.value;
  const nextDate = nextMonth.toPlainDate({ day: Math.min(current.day, nextMonth.daysInMonth) });
  syncingCursorFromScroll = true;
  props.builder.api.goTo(nextDate);
  queueMicrotask(() => {
    syncingCursorFromScroll = false;
  });
}

async function extendIfNeeded(): Promise<void> {
  const container = root.value;
  if (!container || adjustingMonths) return;
  if (container.scrollTop < 320) {
    adjustingMonths = true;
    const first = months.value[0];
    const oldFirstKey = monthKey(first);
    const oldFirstTop = sectionElement(oldFirstKey)?.getBoundingClientRect().top ?? 0;
    let next = [
      ...Array.from({ length: 6 }, (_, index) => first.subtract({ months: 6 - index })),
      ...months.value,
    ];
    if (next.length > MAX_MATERIALIZED_MONTHS) next = next.slice(0, MAX_MATERIALIZED_MONTHS);
    months.value = next;
    await nextTick();
    const newFirstTop = sectionElement(oldFirstKey)?.getBoundingClientRect().top ?? oldFirstTop;
    container.scrollTop += newFirstTop - oldFirstTop;
    adjustingMonths = false;
  } else if (container.scrollHeight - container.scrollTop - container.clientHeight < 640) {
    adjustingMonths = true;
    const last = months.value.at(-1)!;
    let next = [
      ...months.value,
      ...Array.from({ length: 6 }, (_, index) => last.add({ months: index + 1 })),
    ];
    const trimCount = Math.max(0, next.length - MAX_MATERIALIZED_MONTHS);
    const anchor = next[trimCount];
    const anchorKey = monthKey(anchor);
    const oldAnchorTop = sectionElement(anchorKey)?.getBoundingClientRect().top ?? 0;
    if (trimCount > 0) next = next.slice(trimCount);
    months.value = next;
    await nextTick();
    if (trimCount > 0) {
      const newAnchorTop = sectionElement(anchorKey)?.getBoundingClientRect().top ?? oldAnchorTop;
      container.scrollTop += newAnchorTop - oldAnchorTop;
    }
    adjustingMonths = false;
  }
}

function onScroll(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    updateCursorFromViewport();
    void extendIfNeeded();
  });
}

watch(
  () => props.builder.state.date.value,
  (date) => {
    if (syncingCursorFromScroll) return;
    const target = yearMonthOf(date);
    if (monthKey(target) === activeMonthKey.value) return;
    void ensureMonthAndAlign(target, 'smooth');
  },
);

// Reflowing 52 ↔ 68 ↔ 94 px rows must not move the month the user is reading.
watch(
  () => toValue(props.builder.state.monthDensity),
  async () => {
    const container = root.value;
    const section = sectionElement(activeMonthKey.value);
    if (!container || !section) return;
    adjustingMonths = true;
    const offset = section.getBoundingClientRect().top - container.getBoundingClientRect().top;
    await nextTick();
    const updated = sectionElement(activeMonthKey.value);
    if (updated) {
      container.scrollTop +=
        updated.getBoundingClientRect().top - container.getBoundingClientRect().top - offset;
    }
    requestAnimationFrame(() => {
      adjustingMonths = false;
    });
  },
  { flush: 'sync' },
);

onMounted(async () => {
  await nextTick();
  alignMonthToTop(activeMonthKey.value);
  root.value?.addEventListener('scroll', onScroll, { passive: true });
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  root.value?.removeEventListener('scroll', onScroll);
});

defineExpose({
  scrollToMonth: (month: Temporal.PlainYearMonth) => ensureMonthAndAlign(month, 'smooth'),
  activeMonth: computed(() => Temporal.PlainYearMonth.from(activeMonthKey.value)),
});
</script>

<template>
  <div
    ref="root"
    class="coar-continuous-month-view"
    :class="{ 'coar-continuous-month-view--shade-weekends': shadeWeekends }"
    aria-label="Continuous month calendar"
  >
    <section
      v-for="month in months"
      :key="monthKey(month)"
      class="coar-continuous-month-view__section"
      :data-month-key="monthKey(month)"
      :aria-label="formatMonth(month)"
    >
      <h2 class="coar-continuous-month-view__title">{{ formatMonth(month) }}</h2>
      <CoarMonthView
        :builder="builder"
        :month="month"
        :manage-view-window="false"
        continuous-section
      >
        <template v-if="$slots.pill" #pill="slotProps">
          <slot name="pill" v-bind="slotProps" />
        </template>
        <template v-if="$slots.multiDayBar" #multiDayBar="slotProps">
          <slot name="multiDayBar" v-bind="slotProps" />
        </template>
      </CoarMonthView>
    </section>
  </div>
</template>

<style scoped>
.coar-continuous-month-view {
  --coar-calendar-continuous-separator: color-mix(
    in srgb,
    var(--coar-calendar-border, #d1d5db) 52%,
    transparent
  );
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overflow-anchor: none;
  overscroll-behavior-y: contain;
  background: var(--coar-calendar-bg, #fff);
  scrollbar-gutter: stable;
  scroll-padding-bottom: var(--coar-calendar-scroll-inset-bottom, 0px);
}
/* Bottom content inset (iOS parity) — a real trailing block, because
   block-end padding on a scroller is not scrollable in every engine. */
.coar-continuous-month-view::after {
  content: '';
  display: block;
  height: var(--coar-calendar-scroll-inset-bottom, 0px);
}
.coar-continuous-month-view__section {
  position: relative;
}
.coar-continuous-month-view__title {
  margin: 0;
  padding: 20px 16px 10px;
  color: var(--coar-text-base, #1a1c1f);
  font-size: clamp(1.55rem, 2.1vw, 2rem);
  font-weight: 750;
  line-height: 1.2;
}
.coar-continuous-month-view__section :deep(.coar-month-grid__weekday-row) {
  position: static;
  border-bottom-color: var(--coar-calendar-continuous-separator);
}
.coar-continuous-month-view__section :deep(.coar-month-grid__weekday-cell) {
  border-left: 0;
  text-align: center;
}
.coar-continuous-month-view__section :deep(.coar-month-grid__weekday-cell:nth-child(n + 6)) {
  color: color-mix(in srgb, var(--coar-text-subtle, #6c7280) 58%, transparent);
}
.coar-continuous-month-view--shade-weekends
  .coar-continuous-month-view__section
  :deep(.coar-month-grid__weekday-cell:nth-child(n + 6)) {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-continuous-month-view__section :deep(.coar-month-row) {
  border-bottom: 0;
}
.coar-continuous-month-view__section :deep(.coar-month-row:not(:last-child)) {
  border-bottom: 1px solid var(--coar-calendar-continuous-separator);
}
.coar-continuous-month-view__section :deep(.coar-month-cell) {
  border-left: 0;
}
.coar-continuous-month-view__section :deep(.coar-month-cell__day-number-row) {
  /* The iOS-style today marker is 27px high. The classic 24px header row
   * would let it protrude beyond the paint-contained cell and clip its top. */
  height: 31px;
  flex: 0 0 31px;
  padding-block: 2px;
}
.coar-continuous-month-view__section :deep(.coar-month-cell--weekend) {
  background: var(--coar-calendar-bg, #fff);
}
.coar-continuous-month-view--shade-weekends
  .coar-continuous-month-view__section
  :deep(.coar-month-cell--weekend) {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-continuous-month-view__section :deep(.coar-month-cell--weekend .coar-month-cell__day-number) {
  color: var(--coar-text-subtle, #6c7280);
  font-weight: 500;
}
.coar-continuous-month-view__section :deep(.coar-month-cell--today) {
  background: var(--coar-calendar-bg, #fff);
}
.coar-continuous-month-view__section :deep(.coar-month-cell--today .coar-month-cell__day-number) {
  display: inline-flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--coar-color-danger, #ff3b30);
  color: white;
}
/* Density changes affect every preceding section. A height transition would keep
 * moving the anchor for 200 ms after Vue has restored it, so continuous sections
 * reflow atomically. Row expansion remains animated in the standalone grid. */
.coar-continuous-month-view__section :deep(.coar-month-row) {
  transition: none;
}
</style>
