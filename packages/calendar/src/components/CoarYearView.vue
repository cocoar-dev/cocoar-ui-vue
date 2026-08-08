<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
import { computed, toValue } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import { Temporal, detectFirstDayOfWeekFromLocale, monthGridDates, todayInZone } from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();
useViewWindow(props.builder, { view: 'year' });

const localization = useLocalization();
const locale = computed(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);
const firstDayOfWeek = computed(
  () => toValue(props.builder.state.firstDayOfWeek) ?? detectFirstDayOfWeekFromLocale(locale.value),
);
const year = computed(() => props.builder.state.date.value.year);
const today = computed(() => todayInZone(toValue(props.builder.state.timezone)));
const monthFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      month: 'long',
      timeZone: 'UTC',
    }),
);
const weekdayFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      weekday: 'narrow',
      timeZone: 'UTC',
    }),
);

const weekdayLabels = computed(() => {
  const sunday = Temporal.PlainDate.from('2026-08-02');
  const start = sunday.add({ days: firstDayOfWeek.value });
  return Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.value.format(new Date(`${start.add({ days: index })}T00:00:00Z`)),
  );
});

const months = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const first = Temporal.PlainDate.from({ year: year.value, month: index + 1, day: 1 });
    return {
      first,
      label: monthFormatter.value.format(new Date(`${first}T00:00:00Z`)),
      days: monthGridDates(Temporal.PlainYearMonth.from(first), firstDayOfWeek.value),
    };
  }),
);

function openMonth(date: Temporal.PlainDate) {
  props.builder.api.goTo(date);
  props.builder.api.setView('month');
}
</script>

<template>
  <div class="coar-year-view" role="grid" :aria-label="String(year)">
    <section v-for="month in months" :key="month.first.month" class="coar-year-view__month">
      <button class="coar-year-view__month-title" type="button" @click="openMonth(month.first)">
        {{ month.label }}
      </button>
      <div class="coar-year-view__weekdays" aria-hidden="true">
        <span v-for="(label, index) in weekdayLabels" :key="index">{{ label }}</span>
      </div>
      <div class="coar-year-view__days">
        <button
          v-for="day in month.days"
          :key="day.toString()"
          type="button"
          class="coar-year-view__day"
          :class="{
            'coar-year-view__day--outside': day.month !== month.first.month,
            'coar-year-view__day--today': Temporal.PlainDate.compare(day, today) === 0,
          }"
          :tabindex="day.month === month.first.month ? 0 : -1"
          @click="openMonth(day)"
        >
          {{ day.day }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.coar-year-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 24px 28px;
  box-sizing: border-box;
  height: 100%;
  padding: 20px;
  overflow: auto;
  background: var(--coar-calendar-bg, #fff);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.coar-year-view__month {
  min-width: 0;
}
.coar-year-view__month-title {
  margin: 0 0 8px;
  padding: 2px 4px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--coar-text-base, #1a1c1f);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-transform: capitalize;
}
.coar-year-view__month-title:hover {
  background: var(--coar-surface-subtle, #f3f4f6);
}
.coar-year-view__weekdays,
.coar-year-view__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}
.coar-year-view__weekdays {
  margin-bottom: 3px;
  color: var(--coar-text-subtle, #6b7280);
  font-size: var(--coar-font-size-xs, 11px);
}
.coar-year-view__day {
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--coar-text-base, #1a1c1f);
  font: inherit;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
}
.coar-year-view__day:hover:not(.coar-year-view__day--today) {
  background: var(--coar-surface-subtle, #f3f4f6);
}
.coar-year-view__day--outside {
  visibility: hidden;
}
.coar-year-view__day--today {
  background: var(--coar-background-accent-primary, #2563eb);
  color: white;
  font-weight: 700;
}
</style>
