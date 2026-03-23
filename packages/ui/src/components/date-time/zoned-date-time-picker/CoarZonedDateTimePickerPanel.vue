<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { useI18n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarSelect from '../../select/CoarSelect.vue';
import CoarScrollableCalendar from '../scrollable-calendar/CoarScrollableCalendar.vue';
import CoarTimePicker from '../time-picker/CoarTimePicker.vue';
import { vScrollbar } from '../../scrollbar';
import type { DateFormatConfig, CoarDateMarker, CoarTimeValue } from '../_shared/types';
import {
  coarFilterTimezones,
  coarGroupTimezones,
  coarFormatTimezoneLabel,
  type TimezoneGroup,
} from '../_shared/timezone-helpers';

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
  use24Hour: boolean;
  minuteStep: 1 | 5 | 10 | 15;
  effectiveMinTime: CoarTimeValue | null;
  effectiveMaxTime: CoarTimeValue | null;
  effectiveDisplayTimeZone: string;
  valueTimeZone: string | null;
  allTimezones: string[];
  timezoneFilter: string[];
  valueTimeZoneLabel: string;
  timeZonesDiffer: boolean;
  hasValue: boolean;
  formatValueInValueTz: string;
  onDateSelected: (date: Temporal.PlainDate) => void;
  onActiveMonthChanged: (ym: Temporal.PlainYearMonth) => void;
  onSelectMonth: (ym: Temporal.PlainYearMonth) => void;
  onPreviousYear: () => void;
  onNextYear: () => void;
  onScrollToTodayMonth: () => void;
  onTimeChanged: (time: CoarTimeValue | null) => void;
  onSelectDisplayTimezone: (tzId: string) => void;
  onChangeValueTimezone: (tzId: string) => void;
}>();

// i18n
const { t } = useI18n();

// Panel-local timezone UI state
const isSelectingDisplayTimezone = ref(false);
const isEditingValueTimezone = ref(false);
const timezoneSearchQuery = ref('');
const tzSearchInputRef = ref<HTMLInputElement | null>(null);
const tzPickerListRef = ref<HTMLElement | null>(null);

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

// Filtered & grouped timezones
const filteredTimezones = computed(() =>
  coarFilterTimezones(props.allTimezones, props.timezoneFilter),
);

const groupedTimezoneList = computed((): TimezoneGroup[] =>
  coarGroupTimezones(filteredTimezones.value, timezoneSearchQuery.value),
);

const timezoneOptions = computed(() =>
  filteredTimezones.value.map((tz) => ({
    value: tz,
    label: coarFormatTimezoneLabel(tz),
  })),
);

// Timezone panel actions
function openDisplayTimezonePicker() {
  isSelectingDisplayTimezone.value = true;
  timezoneSearchQuery.value = '';
  nextTick(() => {
    tzSearchInputRef.value?.focus();
    // Allow the list + OverlayScrollbars to render, then scroll to active timezone
    setTimeout(() => {
      const activeItem = tzPickerListRef.value?.querySelector('.coar-zdtp-tz-picker-item--active') as HTMLElement | null;
      activeItem?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, 50);
  });
}

function closeDisplayTimezonePicker() {
  isSelectingDisplayTimezone.value = false;
  timezoneSearchQuery.value = '';
}

function selectDisplayTimezone(tzId: string) {
  props.onSelectDisplayTimezone(tzId);
  closeDisplayTimezonePicker();
}

function startEditValueTimezone() {
  isEditingValueTimezone.value = true;
}

function changeValueTimezone(newTzId: string) {
  props.onChangeValueTimezone(newTzId);
  isEditingValueTimezone.value = false;
}

function cancelEditValueTimezone() {
  isEditingValueTimezone.value = false;
}
</script>

<template>
  <div
    class="coar-zdtp-panel"
    :class="{ 'coar-zdtp-panel--with-weeks': showWeekNumbers }"
  >
    <!-- Panel body (two columns) -->
    <div class="coar-zdtp-body">
      <!-- Left Column: Calendar -->
      <div class="coar-zdtp-calendar-column">
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

        <!-- Today FAB -->
        <button
          v-if="showTodayFab"
          type="button"
          class="coar-zdtp-today-fab"
          :aria-label="t('coar.ui.datePicker.jumpToToday', undefined, 'Jump to today\'s month')"
          @click="onScrollToTodayMonth"
        >
          <CoarIcon :name="todayMonthDirection === 'up' ? 'chevron-up' : 'chevron-down'" size="xs" />
        </button>
      </div>

      <!-- Right Column -->
      <div class="coar-zdtp-side-column">
        <!-- Header: Year stepper OR timezone search -->
        <div v-if="!isSelectingDisplayTimezone" class="coar-zdtp-side-header">
          <button
            type="button"
            class="coar-zdtp-year-btn"
            :disabled="isPrevYearDisabled"
            :aria-label="t('coar.ui.datePicker.previousYear', undefined, 'Previous year')"
            @click="onPreviousYear"
          >
            <CoarIcon name="chevron-left" size="s" />
          </button>
          <span class="coar-zdtp-year">{{ currentYear }}</span>
          <button
            type="button"
            class="coar-zdtp-year-btn"
            :disabled="isNextYearDisabled"
            :aria-label="t('coar.ui.datePicker.nextYear', undefined, 'Next year')"
            @click="onNextYear"
          >
            <CoarIcon name="chevron-right" size="s" />
          </button>
        </div>

        <div v-else class="coar-zdtp-side-header coar-zdtp-side-header--search">
          <input
            ref="tzSearchInputRef"
            v-model="timezoneSearchQuery"
            type="text"
            class="coar-zdtp-tz-search-input"
            :placeholder="t('coar.ui.zonedDateTimePicker.searchTimezone', undefined, 'Search timezone...')"
            @keydown.escape.stop="closeDisplayTimezonePicker"
          />
          <button
            type="button"
            class="coar-zdtp-tz-search-close"
            :aria-label="t('coar.ui.zonedDateTimePicker.closeTimezoneSearch', undefined, 'Close timezone search')"
            @click="closeDisplayTimezonePicker"
          >
            <CoarIcon name="x" size="xs" />
          </button>
        </div>

        <!-- Timezone picker list (replaces month grid + time + events) -->
        <div v-if="isSelectingDisplayTimezone" ref="tzPickerListRef" v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave' }" class="coar-zdtp-tz-picker-list">
          <div
            v-for="group in groupedTimezoneList"
            :key="group.name"
            class="coar-zdtp-tz-group"
          >
            <div class="coar-zdtp-tz-group-header">{{ group.name }}</div>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="coar-zdtp-tz-picker-item"
              :class="{ 'coar-zdtp-tz-picker-item--active': item.id === effectiveDisplayTimeZone }"
              @click="selectDisplayTimezone(item.id)"
            >
              <span class="coar-zdtp-tz-picker-item-city">{{ item.city }}</span>
              <span class="coar-zdtp-tz-picker-item-offset">{{ item.offset }}</span>
            </button>
          </div>
        </div>

        <!-- Normal side content (when NOT selecting display TZ) -->
        <template v-if="!isSelectingDisplayTimezone">
          <!-- Month grid (4-column) -->
          <div class="coar-zdtp-month-grid" role="listbox" :aria-label="t('coar.ui.datePicker.months', undefined, 'Months')">
            <button
              v-for="item in monthItems"
              :key="item.month"
              type="button"
              class="coar-zdtp-month-item"
              :class="{ 'coar-zdtp-month-item--active': item.isActive }"
              role="option"
              :aria-selected="item.isActive"
              @click="onSelectMonth(item.yearMonth)"
            >
              {{ item.name }}
            </button>
          </div>

          <!-- Time Picker -->
          <div class="coar-zdtp-time-section">
            <CoarTimePicker
              :model-value="selectedTime ?? undefined"
              :use24-hour="use24Hour"
              :minute-step="minuteStep"
              :min="effectiveMinTime ?? undefined"
              :max="effectiveMaxTime ?? undefined"
              size="s"
              @update:model-value="onTimeChanged"
            />
          </div>

          <!-- Display timezone button -->
          <div class="coar-zdtp-display-tz-label">{{ t('coar.ui.zonedDateTimePicker.displayTimezone', undefined, 'Display Timezone') }}</div>
          <button
            type="button"
            class="coar-zdtp-display-tz-btn"
            @click="openDisplayTimezonePicker"
          >
            <span class="coar-zdtp-display-tz-btn-label">
              {{ coarFormatTimezoneLabel(effectiveDisplayTimeZone) }}
            </span>
            <CoarIcon name="chevron-down" size="xs" />
          </button>

          <!-- Events for selected date -->
          <div v-if="selectedDateMarkers.length > 0" v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave' }" class="coar-zdtp-events">
            <div
              v-for="(marker, idx) in selectedDateMarkers"
              :key="idx"
              class="coar-zdtp-event-item"
              :class="marker.cssClass"
            >
              {{ marker.description }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Footer: Value timezone display -->
    <div
      class="coar-zdtp-footer"
      :class="{ 'coar-zdtp-footer--differs': timeZonesDiffer }"
    >
      <template v-if="!hasValue">
        <span class="coar-zdtp-footer-placeholder">
          <CoarIcon name="map-pin" size="xs" />
          <span>{{ t('coar.ui.zonedDateTimePicker.eventTimezone', undefined, 'Event timezone') }}</span>
        </span>
      </template>

      <template v-else-if="isEditingValueTimezone">
        <div class="coar-zdtp-footer-edit">
          <CoarSelect
            :model-value="valueTimeZone"
            :options="timezoneOptions"
            appearance="inline"
            size="xs"
            searchable
            :search-placeholder="t('coar.ui.zonedDateTimePicker.searchTimezone', undefined, 'Search timezone...')"
            class="coar-zdtp-footer-tz-select"
            @update:model-value="(v: string) => changeValueTimezone(v)"
          />
          <button
            type="button"
            class="coar-zdtp-footer-cancel"
            :aria-label="t('coar.ui.zonedDateTimePicker.cancelTimezoneEdit', undefined, 'Cancel timezone edit')"
            @click="cancelEditValueTimezone"
          >
            <CoarIcon name="x" size="xs" />
          </button>
        </div>
      </template>

      <template v-else>
        <div class="coar-zdtp-footer-display">
          <CoarIcon name="map-pin" size="xs" class="coar-zdtp-footer-icon" />
          <span class="coar-zdtp-footer-tz-name">{{ valueTimeZoneLabel }}</span>
          <span class="coar-zdtp-footer-tz-value">{{ formatValueInValueTz }}</span>
          <button
            type="button"
            class="coar-zdtp-footer-lock"
            :aria-label="t('coar.ui.zonedDateTimePicker.changeEventTimezone', undefined, 'Change event timezone')"
            @click="startEditValueTimezone"
          >
            <CoarIcon name="settings" size="xs" />
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
/* Panel styles are unscoped so they work inside the overlay host */

.coar-zdtp-panel {
  display: flex;
  flex-direction: column;
  min-width: min(480px, calc(100vw - 16px));
  max-width: min(600px, calc(100vw - 16px));
  max-height: 440px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  overflow: hidden;
}

.coar-zdtp-panel--with-weeks {
  min-width: min(528px, calc(100vw - 16px));
  max-width: min(648px, calc(100vw - 16px));
}

.coar-zdtp-body {
  display: flex;
  flex-direction: row;
  flex: 0 0 auto;
  min-height: 0;
  height: 330px;
  overflow: hidden;
}

.coar-zdtp-calendar-column {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
}

.coar-zdtp-today-fab {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--coar-border-neutral-secondary);
  background: var(--coar-background-neutral-primary);
  box-shadow: var(--coar-shadow-s);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  z-index: 10;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out), transform var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-today-fab:hover { background: var(--coar-background-neutral-secondary); color: var(--coar-icon-neutral-primary); }
.coar-zdtp-today-fab:active { transform: scale(0.95); }

.coar-zdtp-side-column {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  background: var(--coar-background-neutral-secondary);
  border-left: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-zdtp-side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  padding: var(--coar-spacing-s);
  flex-shrink: 0;
  min-height: 44px;
}

.coar-zdtp-side-header--search {
  gap: var(--coar-spacing-xs);
}

.coar-zdtp-year-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--coar-radius-xs);
  border: none;
  background: none;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--coar-duration-fast) var(--coar-ease-out), background-color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-year-btn:hover:not(:disabled) { opacity: 1; background: var(--coar-background-neutral-tertiary); }
.coar-zdtp-year-btn:disabled { cursor: not-allowed; opacity: 0.2; }

.coar-zdtp-year {
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-headings-heading-weight);
  color: var(--coar-text-neutral-primary);
  user-select: none;
}

.coar-zdtp-tz-search-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  padding: 0 var(--coar-spacing-xs);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  background: var(--coar-surface-input);
  outline: none;
}
.coar-zdtp-tz-search-input:focus {
  border-color: var(--coar-border-accent-primary);
}
.coar-zdtp-tz-search-input::placeholder {
  color: var(--coar-text-neutral-disabled);
}

.coar-zdtp-tz-search-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
}
.coar-zdtp-tz-search-close:hover { background: var(--coar-background-neutral-tertiary); }

.coar-zdtp-tz-picker-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.coar-zdtp-tz-picker-list::-webkit-scrollbar { display: none; }

.coar-zdtp-tz-group-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-secondary);
  text-transform: uppercase;
  background: var(--coar-background-neutral-secondary);
  letter-spacing: 0.5px;
}

.coar-zdtp-tz-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  text-align: left;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-tz-picker-item:hover {
  background: var(--coar-background-neutral-tertiary);
}
.coar-zdtp-tz-picker-item--active {
  background: var(--coar-surface-accent-secondary);
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-body-small-bold-weight);
}

.coar-zdtp-tz-picker-item-city {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-zdtp-tz-picker-item-offset {
  flex-shrink: 0;
  margin-left: var(--coar-spacing-xs);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-tertiary);
}

.coar-zdtp-month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  flex-shrink: 0;
}

.coar-zdtp-month-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border: none;
  border-radius: var(--coar-radius-xs);
  background: none;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-month-item:hover { background: var(--coar-background-neutral-tertiary); }
.coar-zdtp-month-item--active {
  background: var(--coar-surface-accent-secondary);
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-body-small-bold-weight);
}

.coar-zdtp-time-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  flex-shrink: 0;
}

.coar-zdtp-display-tz-label {
  padding: var(--coar-spacing-xs) var(--coar-spacing-s) 0;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-tertiary);
}

.coar-zdtp-display-tz-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  width: 100%;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: none;
  border-top: 1px solid var(--coar-border-neutral-tertiary);
  background: none;
  cursor: pointer;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
  text-align: left;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-display-tz-btn:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

.coar-zdtp-display-tz-btn-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-zdtp-events {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border-top: 1px solid var(--coar-border-neutral-tertiary);
}
.coar-zdtp-events::-webkit-scrollbar { display: none; }

.coar-zdtp-event-item {
  padding: var(--coar-spacing-xs) 0;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  border-bottom: 1px solid var(--coar-border-neutral-quaternary);
}
.coar-zdtp-event-item:last-child { border-bottom: none; }

/* Footer */
.coar-zdtp-footer {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 var(--coar-spacing-s);
  border-top: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  flex-shrink: 0;
}

.coar-zdtp-footer--differs .coar-zdtp-footer-tz-name {
  font-weight: var(--coar-body-bold-weight);
}
.coar-zdtp-footer--differs .coar-zdtp-footer-tz-value {
  font-weight: var(--coar-body-small-bold-weight);
}

.coar-zdtp-footer-placeholder {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-disabled);
}

.coar-zdtp-footer-display {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  width: 100%;
  min-width: 0;
}

.coar-zdtp-footer-icon {
  flex-shrink: 0;
  color: var(--coar-icon-neutral-secondary);
}

.coar-zdtp-footer-tz-name {
  flex-shrink: 0;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  white-space: nowrap;
}

.coar-zdtp-footer-tz-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-zdtp-footer-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--coar-icon-neutral-tertiary);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
  transition: color var(--coar-duration-fast) var(--coar-ease-out), background-color var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-footer-lock:hover {
  color: var(--coar-icon-neutral-primary);
  background: var(--coar-background-neutral-tertiary);
}

.coar-zdtp-footer-edit {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  width: 100%;
}

.coar-zdtp-footer-tz-select {
  flex: 1;
  min-width: 0;
}

.coar-zdtp-footer-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
}
.coar-zdtp-footer-cancel:hover {
  background: var(--coar-background-neutral-tertiary);
}

/* Stacked single-column layout for small viewports */
@media (max-width: 540px) {
  .coar-zdtp-panel {
    max-height: 90dvh;
    overflow-y: auto;
  }

  .coar-zdtp-body {
    flex-direction: column;
    height: auto;
  }

  .coar-zdtp-calendar-column {
    flex: 0 0 340px;
    overflow: hidden;
  }

  .coar-zdtp-side-column {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--coar-border-neutral-tertiary);
  }
}
</style>
