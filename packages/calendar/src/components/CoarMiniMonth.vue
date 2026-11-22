<script setup lang="ts">
/**
 * `<CoarMiniMonth>` — a small month for picking a day.
 *
 * Needs no builder. It leafs through months on its own and follows
 * `modelValue` when that moves to another month. Always six rows, so
 * nothing below it jumps while leafing.
 */

import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import {
  Temporal,
  detectFirstDayOfWeekFromLocale,
  localizedWeekdayNames,
  monthGridDates,
  startOfWeek,
  todayInZone,
  type DayOfWeek,
} from '../core';
import type { MonthDaySlotScope } from '../builders/types';

const props = withDefaults(
  defineProps<{
    /** The selected day. */
    modelValue?: Temporal.PlainDate | null;
    /** BCP-47 locale. Default: the app's localization. */
    locale?: string;
    /** `0` = Sunday. Default: from the locale. */
    firstDayOfWeek?: DayOfWeek;
    /** IANA zone that decides which day is today. Default: the system's. */
    timezone?: string;
    /** Tint the week of the selected day. */
    highlightWeek?: boolean;
  }>(),
  {
    modelValue: null,
    locale: undefined,
    firstDayOfWeek: undefined,
    timezone: undefined,
    highlightWeek: true,
  },
);

const emit = defineEmits<{ 'update:modelValue': [date: Temporal.PlainDate] }>();

defineSlots<{ day?(props: MonthDaySlotScope): unknown }>();

const { t } = useI18n();
const localization = useLocalization();
const locale = computed(() => props.locale ?? localization?.language.value ?? 'en-US');
const firstDay = computed(
  () => props.firstDayOfWeek ?? detectFirstDayOfWeekFromLocale(locale.value),
);
const zone = computed(() => props.timezone ?? Temporal.Now.timeZoneId());
const today = computed(() => todayInZone(zone.value));

const month = ref(Temporal.PlainYearMonth.from(props.modelValue ?? today.value));
watch(
  () => props.modelValue,
  (date) => {
    if (date) month.value = Temporal.PlainYearMonth.from(date);
  },
);

const title = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(month.value.year, month.value.month - 1, 1)),
  ),
);
const weekdays = computed(() =>
  localizedWeekdayNames(locale.value, firstDay.value, 'narrow'),
);
const days = computed(() => monthGridDates(month.value, firstDay.value));
const weeks = computed(() =>
  Array.from({ length: 6 }, (_, w) => days.value.slice(w * 7, w * 7 + 7)),
);

const same = (a: Temporal.PlainDate | null, b: Temporal.PlainDate) =>
  !!a && Temporal.PlainDate.compare(a, b) === 0;
const selectedWeek = computed(() =>
  props.highlightWeek && props.modelValue
    ? startOfWeek(props.modelValue, firstDay.value).toString()
    : null,
);
const inSelectedWeek = (date: Temporal.PlainDate) =>
  selectedWeek.value === startOfWeek(date, firstDay.value).toString();
const scopeOf = (date: Temporal.PlainDate): MonthDaySlotScope => ({
  date,
  isToday: same(today.value, date),
  isSelected: same(props.modelValue, date),
  isOtherMonth: date.month !== month.value.month || date.year !== month.value.year,
});
const dayLabel = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
);
const labelOf = (date: Temporal.PlainDate) =>
  dayLabel.value.format(new Date(`${date}T00:00:00Z`));

// ─── Keyboard: one tab stop, arrows move it ──────────────────────────

const root = useTemplateRef<HTMLElement>('root');
const focused = ref<Temporal.PlainDate | null>(null);
const tabStop = computed(() => {
  const inMonth = (date: Temporal.PlainDate | null) =>
    !!date && days.value.some((d) => same(date, d)) ? date : null;
  return (
    inMonth(focused.value) ??
    inMonth(props.modelValue) ??
    inMonth(today.value) ??
    month.value.toPlainDate({ day: 1 })
  );
});

async function focusDay(date: Temporal.PlainDate): Promise<void> {
  focused.value = date;
  if (!days.value.some((d) => same(date, d))) month.value = Temporal.PlainYearMonth.from(date);
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-day-key="${date}"]`)?.focus();
}

function onDayKeydown(e: KeyboardEvent, date: Temporal.PlainDate): void {
  const offsets: Record<string, Temporal.DurationLike> = {
    ArrowLeft: { days: -1 },
    ArrowRight: { days: 1 },
    ArrowUp: { days: -7 },
    ArrowDown: { days: 7 },
    PageUp: { months: -1 },
    PageDown: { months: 1 },
  };
  const offset = offsets[e.key];
  if (!offset) return;
  e.preventDefault();
  void focusDay(date.add(offset));
}
</script>

<template>
  <div ref="root" class="coar-mini-month">
    <div class="coar-mini-month__head">
      <span class="coar-mini-month__title" aria-live="polite">{{ title }}</span>
      <button
        type="button"
        class="coar-mini-month__nav"
        :aria-label="t('coar.calendar.miniMonth.previous', undefined, 'Previous month')"
        @click="month = month.subtract({ months: 1 })"
      >
        ‹
      </button>
      <button
        type="button"
        class="coar-mini-month__nav"
        :aria-label="t('coar.calendar.miniMonth.next', undefined, 'Next month')"
        @click="month = month.add({ months: 1 })"
      >
        ›
      </button>
    </div>
    <div class="coar-mini-month__grid" role="grid" :aria-label="title">
      <div class="coar-mini-month__row" role="row">
        <span
          v-for="(name, i) in weekdays"
          :key="i"
          class="coar-mini-month__weekday"
          role="columnheader"
        >{{ name }}</span>
      </div>
      <div v-for="(week, w) in weeks" :key="w" class="coar-mini-month__row" role="row">
        <span v-for="date in week" :key="date.toString()" role="gridcell">
          <button
            type="button"
            class="coar-mini-month__day"
            :class="{
              'coar-mini-month__day--other': scopeOf(date).isOtherMonth,
              'coar-mini-month__day--today': scopeOf(date).isToday,
              'coar-mini-month__day--selected': scopeOf(date).isSelected,
              'coar-mini-month__day--week': inSelectedWeek(date),
            }"
            :data-day-key="date.toString()"
            :tabindex="same(tabStop, date) ? 0 : -1"
            :aria-label="labelOf(date)"
            :aria-current="scopeOf(date).isToday ? 'date' : undefined"
            :aria-pressed="scopeOf(date).isSelected"
            @click="emit('update:modelValue', date)"
            @focus="focused = date"
            @keydown="onDayKeydown($event, date)"
          >
            <slot name="day" v-bind="scopeOf(date)">{{ date.day }}</slot>
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-mini-month {
  display: inline-block;
  width: 100%;
  max-width: var(--coar-calendar-mini-month-max-width, 280px);
  box-sizing: border-box;
  color: var(--coar-text-base, #1a1c1f);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-size: var(--coar-calendar-caption-font-size, var(--coar-font-size-xs, 11px));
  font-variant-numeric: tabular-nums;
}
.coar-mini-month__head {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
}
.coar-mini-month__title {
  flex: 1;
  min-width: 0;
  padding-inline: 6px;
  font-size: var(--coar-calendar-label-font-size, var(--coar-font-size-sm, 13px));
  font-weight: var(--coar-calendar-heading-font-weight, 700);
  text-transform: capitalize;
}
.coar-mini-month__nav {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--coar-calendar-control-radius, 5px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 16px;
  cursor: pointer;
}
.coar-mini-month__nav:hover {
  background: var(--coar-calendar-hover-bg, var(--coar-surface-subtle, #f3f4f6));
}
.coar-mini-month__row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.coar-mini-month__weekday {
  padding-block: 2px;
  text-align: center;
  color: var(--coar-calendar-year-muted-color, var(--coar-text-subtle, #6b7280));
}
.coar-mini-month__day {
  width: 100%;
  height: var(--coar-calendar-mini-month-day-size, 26px);
  padding: 0;
  border: 0;
  border-radius: var(--coar-calendar-control-radius, 5px);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.coar-mini-month__day:hover {
  background: var(--coar-calendar-hover-bg, var(--coar-surface-subtle, #f3f4f6));
}
.coar-mini-month__day:focus-visible,
.coar-mini-month__nav:focus-visible {
  outline: 2px solid var(--coar-calendar-focus-color, var(--coar-color-focus, #2563eb));
  outline-offset: -2px;
}
.coar-mini-month__day--week {
  border-radius: 0;
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
.coar-mini-month__day--other {
  color: var(--coar-calendar-faint-text-color, var(--coar-text-subtle, #9ca3af));
}
.coar-mini-month__day--today {
  color: var(--coar-calendar-today-color, var(--coar-color-accent, var(--coar-color-accent-500, #2563eb)));
  font-weight: var(--coar-calendar-strong-font-weight, 700);
}
.coar-mini-month__day--selected {
  border-radius: var(--coar-calendar-control-radius, 5px);
  background: var(--coar-background-accent-primary, #2563eb);
  color: var(--coar-calendar-on-accent, var(--coar-text-on-accent, white));
  font-weight: var(--coar-calendar-strong-font-weight, 700);
}
</style>
