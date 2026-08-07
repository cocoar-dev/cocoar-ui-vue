<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
import { computed, toValue } from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import {
  Temporal,
  buildAgendaItems,
  buildFormatOptions,
  detectFirstDayOfWeekFromLocale,
  isAllDayEvent,
  isTimedEvent,
  localizedWeekdayNames,
  monthGridDates,
  todayInZone,
  type AgendaEventItem,
  type CalendarEvent,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';
import CoarAgendaEvent from './internal/agenda/CoarAgendaEvent.vue';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();
const { t } = useI18n();
const localization = useLocalization();

defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; item: AgendaEventItem<TMeta> }): unknown;
}>();

const state = computed(() => {
  const source = props.builder.state;
  return {
    events: props.builder.api.getVisibleEvents(),
    timezone: toValue(source.timezone),
    locale: toValue(source.locale),
    firstDayOfWeek: toValue(source.firstDayOfWeek),
    dateStyle: toValue(source.dateStyle),
    timeStyle: toValue(source.timeStyle),
    hour12: toValue(source.hour12),
  };
});
const locale = computed(() => state.value.locale ?? localization?.language.value ?? 'en-US');
const firstDayOfWeek = computed(
  () => state.value.firstDayOfWeek ?? detectFirstDayOfWeekFromLocale(locale.value),
);
const selectedDate = computed(() => props.builder.state.date.value);
const month = computed(() => Temporal.PlainYearMonth.from(selectedDate.value));
const days = computed(() => monthGridDates(month.value, firstDayOfWeek.value));
const today = computed(() => todayInZone(state.value.timezone));
const weekdayLabels = computed(() =>
  localizedWeekdayNames(locale.value, firstDayOfWeek.value, 'short'),
);

useViewWindow(props.builder, { view: 'monthList' });

const allItems = computed(() =>
  buildAgendaItems(state.value.events, {
    rangeStart: days.value[0].toString(),
    rangeEnd: days.value.at(-1)!.add({ days: 1 }).toString(),
    timezone: state.value.timezone,
    showEmptyDays: false,
  }),
);
const eventsByDate = computed(() => {
  const result = new Map<string, AgendaEventItem<TMeta>[]>();
  for (const item of allItems.value) {
    if (item.kind !== 'event') continue;
    const bucket = result.get(item.date) ?? [];
    bucket.push(item as AgendaEventItem<TMeta>);
    result.set(item.date, bucket);
  }
  return result;
});
const selectedItems = computed(() => eventsByDate.value.get(selectedDate.value.toString()) ?? []);

const monthTitle = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month.value}-01T00:00:00Z`)),
);
const selectedDateTitle = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDate.value}T00:00:00Z`)),
);

function selectDate(date: Temporal.PlainDate): void {
  props.builder.api.goTo(date);
}
function isSame(left: Temporal.PlainDate, right: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(left, right) === 0;
}
function eventTitle(event: CalendarEvent<TMeta>): string {
  const title = (event.meta as { title?: unknown } | undefined)?.title;
  return typeof title === 'string' ? title : '(untitled)';
}
function eventColor(event: CalendarEvent<TMeta>): string {
  const color = (event.meta as { color?: unknown } | undefined)?.color;
  return typeof color === 'string' ? color : 'var(--coar-color-accent, #2563eb)';
}
function formatTime(event: CalendarEvent<TMeta>): string {
  if (isAllDayEvent(event)) return t('coar.calendar.agenda.allDay', undefined, 'All day');
  if (!isTimedEvent(event)) return '';
  return new Intl.DateTimeFormat(
    locale.value,
    buildFormatOptions(
      {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: state.value.timezone,
      },
      {
        timeStyle: state.value.timeStyle,
        hour12: state.value.hour12,
      },
    ),
  ).format(new Date(event.start.epochMilliseconds));
}
</script>

<template>
  <div class="coar-month-list-view">
    <div class="coar-month-list-view__layout">
      <section class="coar-month-list-view__selector" :aria-label="monthTitle">
        <h2 class="coar-month-list-view__title">{{ monthTitle }}</h2>
        <div class="coar-month-list-view__weekdays" aria-hidden="true">
          <span v-for="label in weekdayLabels" :key="label">{{ label.slice(0, 2) }}</span>
        </div>
        <div class="coar-month-list-view__grid">
          <button
            v-for="date in days"
            :key="date.toString()"
            type="button"
            class="coar-month-list-view__day"
            :class="{
              'coar-month-list-view__day--selected': isSame(date, selectedDate),
              'coar-month-list-view__day--today': isSame(date, today),
              'coar-month-list-view__day--other': date.month !== month.month,
            }"
            :aria-pressed="isSame(date, selectedDate)"
            @click="selectDate(date)"
          >
            <span>{{ date.day }}</span>
            <span
              v-if="eventsByDate.get(date.toString())?.length"
              class="coar-month-list-view__markers"
              aria-hidden="true"
            >
              <i
                v-for="item in eventsByDate.get(date.toString())!.slice(0, 5)"
                :key="item.event.id"
                :style="{ background: eventColor(item.event) }"
              />
            </span>
          </button>
        </div>
      </section>

      <section class="coar-month-list-view__agenda" :aria-label="selectedDate.toString()">
        <h3 class="coar-month-list-view__selected-title">{{ selectedDateTitle }}</h3>
        <div v-if="selectedItems.length" class="coar-month-list-view__events">
          <CoarAgendaEvent
            v-for="item in selectedItems"
            :key="`${item.date}:${item.event.id}`"
            :event="item.event"
            :item="item"
            :time-label="formatTime(item.event)"
            :title="eventTitle(item.event)"
            :color="eventColor(item.event)"
            :continuation-tag="t('coar.calendar.agenda.continuationTag', undefined, '(cont.)')"
            :display-zone="state.timezone"
            @pointerdown="builder.state.onEventClick?.({ event: item.event, native: $event })"
          >
            <template v-if="$slots.event" #default="slotProps">
              <slot name="event" v-bind="slotProps" />
            </template>
          </CoarAgendaEvent>
        </div>
        <p v-else class="coar-month-list-view__empty">
          {{ t('coar.calendar.monthList.empty', undefined, 'No events') }}
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.coar-month-list-view {
  container-type: inline-size;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
}
.coar-month-list-view__layout {
  display: grid;
  grid-template-rows: auto minmax(180px, 1fr);
  height: 100%;
  min-height: 0;
}
.coar-month-list-view__selector {
  padding: var(--coar-spacing-m);
}
.coar-month-list-view__title {
  margin: 0 0 var(--coar-spacing-s);
  font-size: 1.35rem;
}
.coar-month-list-view__weekdays,
.coar-month-list-view__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.coar-month-list-view__weekdays span {
  padding: 4px;
  color: var(--coar-text-neutral-secondary);
  text-align: center;
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
}
.coar-month-list-view__day {
  position: relative;
  display: flex;
  min-height: 42px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--coar-text-neutral-primary);
  font: inherit;
  cursor: pointer;
}
.coar-month-list-view__day:hover:not(.coar-month-list-view__day--selected) {
  background: var(--coar-background-neutral-secondary);
}
.coar-month-list-view__day--selected {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-accent, white);
}
.coar-month-list-view__day--today:not(.coar-month-list-view__day--selected) {
  color: var(--coar-text-danger, #d70015);
  font-weight: 750;
}
.coar-month-list-view__day--other {
  opacity: 0.42;
}
.coar-month-list-view__markers {
  display: flex;
  width: min(28px, 80%);
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
}
.coar-month-list-view__markers i {
  flex: 1;
  min-width: 2px;
}
.coar-month-list-view__agenda {
  min-height: 0;
  overflow: auto;
  border-top: 1px solid var(--coar-border-neutral-tertiary);
}
.coar-month-list-view__selected-title {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  font-size: var(--coar-component-m-font-size);
}
.coar-month-list-view__events {
  display: flex;
  flex-direction: column;
}
.coar-month-list-view__empty {
  padding: var(--coar-spacing-l);
  color: var(--coar-text-neutral-secondary);
  text-align: center;
}
@container (min-width: 720px) {
  .coar-month-list-view__layout {
    grid-template-columns: minmax(320px, 42%) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }
  .coar-month-list-view__selector {
    overflow: auto;
    border-right: 1px solid var(--coar-border-neutral-tertiary);
  }
  .coar-month-list-view__agenda {
    border-top: 0;
  }
  .coar-month-list-view__day {
    min-height: 50px;
  }
}
</style>
