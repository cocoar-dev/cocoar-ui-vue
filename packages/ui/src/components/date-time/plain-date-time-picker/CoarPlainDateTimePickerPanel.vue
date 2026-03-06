<script setup lang="ts">
import { computed } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarScrollableCalendar from '../scrollable-calendar/CoarScrollableCalendar.vue';
import CoarTimePicker from '../time-picker/CoarTimePicker.vue';
import type { DateFormatConfig, CoarDateMarker, CoarTimeValue } from '../_shared/types';

const props = defineProps<{
  modelValue: Temporal.PlainDate | null;
  activeMonth: Temporal.PlainYearMonth;
  min: Temporal.PlainDate | null;
  max: Temporal.PlainDate | null;
  locale: string;
  dateFormatConfig: DateFormatConfig;
  showWeekNumbers: boolean;
  highlightWeekends: boolean;
  markers: CoarDateMarker[];
  showTodayMonthButton: boolean;
  selectedTime: CoarTimeValue | null;
  use24Hour: boolean | 'auto';
  minuteStep: 1 | 5 | 10 | 15;
  disabled: boolean;
  readonly: boolean;
  effectiveMinTime: CoarTimeValue | null;
  effectiveMaxTime: CoarTimeValue | null;
  onDateSelected: (date: Temporal.PlainDate) => void;
  onActiveMonthChanged: (ym: Temporal.PlainYearMonth) => void;
  onSelectMonth: (ym: Temporal.PlainYearMonth) => void;
  onPreviousYear: () => void;
  onNextYear: () => void;
  onScrollToTodayMonth: () => void;
  onTimeChanged: (time: CoarTimeValue | null) => void;
}>();

// Month list
const currentYear = computed(() => props.activeMonth.year);
const currentMonthNumber = computed(() => props.activeMonth.month);
const isPrevYearDisabled = computed(() => currentYear.value <= Temporal.Now.plainDateISO().year - 100);
const isNextYearDisabled = computed(() => currentYear.value >= Temporal.Now.plainDateISO().year + 50);

const monthItems = computed(() => {
  const year = currentYear.value;
  const active = currentMonthNumber.value;
  const formatter = new Intl.DateTimeFormat(props.locale, { month: 'short' });

  const items: Array<{ month: number; name: string; isActive: boolean; yearMonth: Temporal.PlainYearMonth }> = [];
  for (let m = 1; m <= 12; m++) {
    items.push({
      month: m,
      name: formatter.format(new Date(year, m - 1, 1)),
      isActive: m === active,
      yearMonth: Temporal.PlainYearMonth.from({ year, month: m }),
    });
  }
  return items;
});

// Today FAB
const today = computed(() => Temporal.Now.plainDateISO());
const todayMonthDirection = computed((): 'up' | 'down' | 'hidden' => {
  const cmp = Temporal.PlainYearMonth.compare(props.activeMonth, today.value.toPlainYearMonth());
  if (cmp === 0) return 'hidden';
  return cmp > 0 ? 'up' : 'down';
});
const showTodayFab = computed(
  () => props.showTodayMonthButton && todayMonthDirection.value !== 'hidden',
);

// Selected date markers
const selectedDateMarkers = computed((): CoarDateMarker[] => {
  const date = props.modelValue;
  if (!date) return [];
  return props.markers.filter((m) => {
    const afterStart = Temporal.PlainDate.compare(date, m.startDate) >= 0;
    const beforeEnd = m.endDate
      ? Temporal.PlainDate.compare(date, m.endDate) <= 0
      : Temporal.PlainDate.compare(date, m.startDate) === 0;
    return afterStart && beforeEnd;
  });
});
</script>

<template>
  <div
    class="coar-pdtp-panel"
    :class="{ 'coar-pdtp-panel--with-weeks': showWeekNumbers }"
  >
    <!-- Left: Calendar -->
    <div class="coar-pdtp-calendar-column">
      <CoarScrollableCalendar
        :model-value="modelValue"
        :active-month="activeMonth"
        :min="min ?? undefined"
        :max="max ?? undefined"
        :locale="locale"
        :date-format-config="dateFormatConfig"
        :show-week-numbers="showWeekNumbers"
        :highlight-weekends="highlightWeekends"
        :markers="markers"
        @update:active-month="onActiveMonthChanged"
        @date-selected="onDateSelected"
      />
      <button
        v-if="showTodayFab"
        type="button"
        class="coar-pdtp-today-fab"
        aria-label="Jump to today's month"
        @click="onScrollToTodayMonth"
      >
        <CoarIcon :name="todayMonthDirection === 'up' ? 'up' : 'down'" size="xs" />
      </button>
    </div>

    <!-- Right: Month List + Time Picker -->
    <div class="coar-pdtp-side-column">
      <!-- Year Stepper -->
      <div class="coar-pdtp-year-stepper">
        <button type="button" class="coar-pdtp-year-btn" :disabled="isPrevYearDisabled" aria-label="Previous year" @click="onPreviousYear">
          <CoarIcon name="left" size="s" />
        </button>
        <span class="coar-pdtp-year">{{ currentYear }}</span>
        <button type="button" class="coar-pdtp-year-btn" :disabled="isNextYearDisabled" aria-label="Next year" @click="onNextYear">
          <CoarIcon name="right" size="s" />
        </button>
      </div>

      <!-- Month Grid -->
      <div class="coar-pdtp-month-list-wrapper">
        <div class="coar-pdtp-month-list" role="listbox" aria-label="Months">
          <div class="coar-pdtp-month-list-content">
            <button
              v-for="item in monthItems"
              :key="item.month"
              type="button"
              class="coar-pdtp-month-item"
              :class="{ 'coar-pdtp-month-item--active': item.isActive }"
              role="option"
              :aria-selected="item.isActive"
              @click="onSelectMonth(item.yearMonth)"
            >
              {{ item.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Time Picker -->
      <div class="coar-pdtp-time-section">
        <CoarTimePicker
          :model-value="selectedTime"
          :use24-hour="use24Hour"
          :minute-step="minuteStep"
          :locale="locale"
          :disabled="disabled"
          :readonly="readonly"
          :min-time="effectiveMinTime"
          :max-time="effectiveMaxTime"
          size="s"
          @update:model-value="onTimeChanged"
        />
      </div>

      <!-- Events -->
      <div v-if="selectedDateMarkers.length > 0" class="coar-pdtp-events">
        <div class="coar-pdtp-events-list">
          <div class="coar-pdtp-events-content">
            <div v-for="marker in selectedDateMarkers" :key="marker.description" class="coar-pdtp-event-item">
              <span class="coar-pdtp-event-dot" />
              <div class="coar-pdtp-event-details">
                <span class="coar-pdtp-event-text">{{ marker.description }}</span>
                <span v-if="marker.endDate && !marker.startDate.equals(marker.endDate)" class="coar-pdtp-event-dates">
                  {{ marker.startDate.day }}/{{ marker.startDate.month }} – {{ marker.endDate.day }}/{{ marker.endDate.month }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Panel styles are unscoped so they work inside the overlay host */

.coar-pdtp-panel {
  display: flex;
  flex-direction: row;
  min-width: 480px;
  max-width: 600px;
  height: 340px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  overflow: hidden;
}

.coar-pdtp-panel--with-weeks { min-width: 528px; max-width: 648px; }

/* Calendar column */
.coar-pdtp-calendar-column {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--coar-background-neutral-primary);
}

.coar-pdtp-today-fab {
  position: absolute;
  bottom: var(--coar-spacing-m);
  right: var(--coar-spacing-m);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--coar-text-neutral-primary);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-full);
  cursor: pointer;
  box-shadow: var(--coar-shadow-md, 0 2px 8px rgba(0, 0, 0, 0.12));
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), transform var(--coar-duration-fast) var(--coar-ease-out);
  z-index: 10;
}

.coar-pdtp-today-fab:hover { transform: scale(1.05); }
.coar-pdtp-today-fab:active { transform: scale(0.95); }

/* Side column */
.coar-pdtp-side-column {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  background: var(--coar-background-neutral-secondary);
}

/* Year stepper */
.coar-pdtp-year-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  padding: var(--coar-spacing-s);
  flex-shrink: 0;
}

.coar-pdtp-year-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  opacity: 0.35;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out), opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-pdtp-year-btn:hover:not(:disabled) { background: var(--coar-background-neutral-tertiary); color: var(--coar-icon-neutral-primary); opacity: 1; }
.coar-pdtp-year-btn:disabled { color: var(--coar-icon-neutral-disabled); cursor: not-allowed; opacity: 0.35; }

.coar-pdtp-year {
  flex: 1;
  text-align: center;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-bold-weight);
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

/* Month list */
.coar-pdtp-month-list-wrapper { display: flex; flex-direction: column; flex-shrink: 0; }
.coar-pdtp-month-list { flex: 1; }
.coar-pdtp-month-list-content {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--coar-spacing-xxs, 2px) var(--coar-spacing-xxs, 2px);
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
}

.coar-pdtp-month-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  text-align: center;
  cursor: pointer;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-pdtp-month-item:hover { background: var(--coar-background-neutral-tertiary); }
.coar-pdtp-month-item--active { color: var(--coar-text-accent-primary); font-weight: var(--coar-body-small-bold-weight); }

/* Time section */
.coar-pdtp-time-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

/* Events */
.coar-pdtp-events { display: flex; flex-direction: column; flex: 1; min-height: 0; border-top: 1px solid var(--coar-border-neutral-quaternary); margin-bottom: 4px; }
.coar-pdtp-events-list { display: flex; flex-direction: column; gap: 4px; padding: 0 var(--coar-spacing-s) var(--coar-spacing-s); flex: 1; min-height: 0; }
.coar-pdtp-events-content { display: flex; flex-direction: column; gap: var(--coar-spacing-xs); }
.coar-pdtp-event-item { display: flex; align-items: flex-start; gap: var(--coar-spacing-xs); }
.coar-pdtp-event-dot { width: 6px; height: 6px; margin-top: 5px; border-radius: 50%; background: var(--coar-text-accent-primary); flex-shrink: 0; }
.coar-pdtp-event-details { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.coar-pdtp-event-text { font-family: var(--coar-body-small-base-family); font-size: var(--coar-body-caption-size); color: var(--coar-text-neutral-primary); line-height: var(--coar-line-height-snug); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.coar-pdtp-event-dates { font-family: var(--coar-body-small-base-family); font-size: var(--coar-component-xs-font-size); color: var(--coar-text-neutral-secondary); line-height: var(--coar-line-height-tight); }

@media (prefers-reduced-motion: reduce) {
  .coar-pdtp-today-fab,
  .coar-pdtp-year-btn,
  .coar-pdtp-month-item { transition: none; }
}
</style>
