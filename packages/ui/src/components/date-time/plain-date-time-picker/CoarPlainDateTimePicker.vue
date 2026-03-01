<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { Maskito } from '@maskito/core';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarScrollableCalendar from '../scrollable-calendar/CoarScrollableCalendar.vue';
import CoarTimePicker from '../time-picker/CoarTimePicker.vue';
import {
  computeOverlayCoordinates,
  getViewportRect,
  getScrollParents,
} from '../../overlay/overlay-position';
import type { Placement, PositionSpec } from '../../overlay/overlay-types';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import {
  coarFormatPlainDate,
  coarParsePlainDateFromInput,
} from '../_shared/date-helpers';
import {
  coarFormatTime,
  coarParseTimeInput,
  coarDetect12HourFormat,
  coarRoundMinutesToStep,
} from '../_shared/time-helpers';
import { coarCreateDateTimeMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker, CoarTimeValue } from '../_shared/types';

export type CoarPlainDateTimePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    size?: CoarPlainDateTimePickerSize;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    error?: string;
    hint?: string;
    clearable?: boolean;
    showWeekNumbers?: boolean;
    highlightWeekends?: boolean;
    markers?: CoarDateMarker[];
    locale?: string;
    dateFormat?: DateFormatConfig;
    /** Minimum selectable datetime */
    min?: Temporal.PlainDateTime | null;
    /** Maximum selectable datetime */
    max?: Temporal.PlainDateTime | null;
    /** 24h / 12h / auto */
    use24Hour?: boolean | 'auto';
    /** Minute step */
    minuteStep?: 1 | 5 | 10 | 15;
    /** Default time when selecting a date without existing time */
    defaultTime?: CoarTimeValue;
    showTodayMonthButton?: boolean;
  }>(),
  {
    label: '',
    placeholder: '',
    size: 'm',
    disabled: false,
    readonly: false,
    required: false,
    error: '',
    hint: '',
    clearable: true,
    showWeekNumbers: false,
    highlightWeekends: false,
    markers: () => [],
    locale: undefined,
    dateFormat: undefined,
    min: null,
    max: null,
    use24Hour: 'auto',
    minuteStep: 5,
    defaultTime: () => ({ hours: 9, minutes: 0 }),
    showTodayMonthButton: true,
  },
);

const modelValue = defineModel<Temporal.PlainDateTime | null>({ default: null });

const emit = defineEmits<{
  opened: [];
  closed: [];
}>();

// Composable
const localeRef = computed(() => props.locale);
const dateFormatRef = computed(() => props.dateFormat);
const pickerBase = useDatePickerBase({ locale: localeRef, dateFormat: dateFormatRef });

// Active month
const activeMonth = ref<Temporal.PlainYearMonth>(
  modelValue.value?.toPlainDate().toPlainYearMonth() ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
);

// Pending time (stored until a date is selected)
const pendingTime = ref<CoarTimeValue | null>(null);

// IDs
const uid = `coar-plain-dt-picker-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const labelId = `${uid}-label`;
const inputId = `${uid}-input`;
const panelId = `${uid}-panel`;
const messageId = `${uid}-message`;

// Refs
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const dateInputRef = ref<HTMLInputElement | null>(null);

// Display value
const displayValue = ref('');

// Effective use24Hour
const effectiveUse24Hour = computed(() => {
  if (props.use24Hour === true) return true;
  if (props.use24Hour === false) return false;
  return !coarDetect12HourFormat(pickerBase.effectiveLocale.value);
});

// Maskito
let maskitoInstance: Maskito | undefined;

function initMaskito() {
  maskitoInstance?.destroy();
  if (!dateInputRef.value) return;
  const mask = coarCreateDateTimeMask(
    pickerBase.effectiveDateFormat.value.pattern,
    !effectiveUse24Hour.value,
  );
  maskitoInstance = new Maskito(dateInputRef.value, mask);
}

// Format value
function formatValue(val: Temporal.PlainDateTime): string {
  const datePart = coarFormatPlainDate(val.toPlainDate(), pickerBase.effectiveDateFormat.value.pattern);
  const timePart = coarFormatTime(val.hour, val.minute, effectiveUse24Hour.value);
  return `${datePart} ${timePart}`;
}

// Sync display value
watch(
  modelValue,
  (val) => {
    displayValue.value = val ? formatValue(val) : '';
  },
  { immediate: true },
);

watch([dateInputRef, () => pickerBase.effectiveDateFormat.value], () => {
  nextTick(() => initMaskito());
});

onBeforeUnmount(() => maskitoInstance?.destroy());

// Computed
const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);
const isDisabled = computed(() => props.disabled);
const showClearButton = computed(
  () => props.clearable && modelValue.value !== null && !isDisabled.value && !props.readonly,
);
const inputPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder;
  const datePart = pickerBase.effectiveDateFormat.value.pattern.toUpperCase();
  return effectiveUse24Hour.value ? `${datePart} HH:MM` : `${datePart} HH:MM AM/PM`;
});

// Extracted date/time from model
const selectedDate = computed((): Temporal.PlainDate | null =>
  modelValue.value ? modelValue.value.toPlainDate() : null,
);
const selectedTime = computed((): CoarTimeValue | null => {
  if (modelValue.value) return { hours: modelValue.value.hour, minutes: modelValue.value.minute };
  return pendingTime.value;
});
const minDate = computed((): Temporal.PlainDate | null =>
  props.min ? props.min.toPlainDate() : null,
);
const maxDate = computed((): Temporal.PlainDate | null =>
  props.max ? props.max.toPlainDate() : null,
);

// Effective time constraints (only on boundary dates)
const effectiveMinTime = computed((): CoarTimeValue | null => {
  if (!props.min || !selectedDate.value) return null;
  if (Temporal.PlainDate.compare(selectedDate.value, props.min.toPlainDate()) === 0) {
    return { hours: props.min.hour, minutes: props.min.minute };
  }
  return null;
});
const effectiveMaxTime = computed((): CoarTimeValue | null => {
  if (!props.max || !selectedDate.value) return null;
  if (Temporal.PlainDate.compare(selectedDate.value, props.max.toPlainDate()) === 0) {
    return { hours: props.max.hour, minutes: props.max.minute };
  }
  return null;
});

// Month list
const currentYear = computed(() => activeMonth.value.year);
const currentMonthNumber = computed(() => activeMonth.value.month);
const isPrevYearDisabled = computed(() => currentYear.value <= Temporal.Now.plainDateISO().year - 100);
const isNextYearDisabled = computed(() => currentYear.value >= Temporal.Now.plainDateISO().year + 50);
const monthItems = computed(() => {
  const year = currentYear.value;
  const active = currentMonthNumber.value;
  const locale = pickerBase.effectiveLocale.value;
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
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
  const cmp = Temporal.PlainYearMonth.compare(activeMonth.value, today.value.toPlainYearMonth());
  if (cmp === 0) return 'hidden';
  return cmp > 0 ? 'up' : 'down';
});
const showTodayFab = computed(() => props.showTodayMonthButton && todayMonthDirection.value !== 'hidden');

// Selected date markers
const selectedDateMarkers = computed((): CoarDateMarker[] => {
  const date = selectedDate.value;
  if (!date) return [];
  return props.markers.filter((m) => {
    const afterStart = Temporal.PlainDate.compare(date, m.startDate) >= 0;
    const beforeEnd = m.endDate
      ? Temporal.PlainDate.compare(date, m.endDate) <= 0
      : Temporal.PlainDate.compare(date, m.startDate) === 0;
    return afterStart && beforeEnd;
  });
});

// Panel positioning (same as PlainDatePicker)
const panelLeft = ref(0);
const panelTop = ref(0);
const positionSpec: PositionSpec = {
  placement: ['bottom-start', 'top-start'] as Placement[],
  offset: 4,
  flip: true,
  shift: true,
};
let scrollParents: Element[] = [];
let resizeObserver: ResizeObserver | null = null;
let rafId: number | null = null;

function repositionPanel() {
  if (!triggerRef.value || !panelRef.value) return;
  const viewport = getViewportRect();
  const anchorRect = triggerRef.value.getBoundingClientRect();
  const panelRect = panelRef.value.getBoundingClientRect();
  const coords = computeOverlayCoordinates(anchorRect, { width: panelRect.width, height: panelRect.height }, positionSpec, viewport);
  panelLeft.value = Math.round(coords.left);
  panelTop.value = Math.round(coords.top);
}

function scheduleReposition() {
  if (rafId != null) return;
  rafId = requestAnimationFrame(() => { rafId = null; if (pickerBase.isOpen.value) repositionPanel(); });
}

function installListeners() {
  if (!triggerRef.value) return;
  scrollParents = getScrollParents(triggerRef.value);
  for (const sp of scrollParents) sp.addEventListener('scroll', scheduleReposition, { passive: true });
  window.addEventListener('resize', scheduleReposition, { passive: true });
  resizeObserver = new ResizeObserver(scheduleReposition);
  resizeObserver.observe(triggerRef.value);
}

function removeListeners() {
  for (const sp of scrollParents) sp.removeEventListener('scroll', scheduleReposition);
  scrollParents = [];
  window.removeEventListener('resize', scheduleReposition);
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

// Open/close
function openPanel() {
  if (isDisabled.value || props.readonly || pickerBase.isOpen.value) return;
  if (modelValue.value) activeMonth.value = modelValue.value.toPlainDate().toPlainYearMonth();
  pickerBase.open();
  emit('opened');
  nextTick(() => requestAnimationFrame(() => { repositionPanel(); installListeners(); }));
}

function closePanel() {
  if (!pickerBase.isOpen.value) return;
  pickerBase.close();
  removeListeners();
  emit('closed');
}

function togglePanel() {
  if (pickerBase.isOpen.value) {
    closePanel();
  } else {
    openPanel();
  }
}

// Outside click
function onDocumentMouseDown(event: MouseEvent) {
  if (!pickerBase.isOpen.value) return;
  const target = event.target as Node;
  if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return;
  closePanel();
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown);
  nextTick(() => initMaskito());
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown);
  removeListeners();
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && pickerBase.isOpen.value) {
    event.preventDefault(); closePanel(); dateInputRef.value?.focus();
  } else if ((event.key === 'Enter' || event.key === 'ArrowDown') && !pickerBase.isOpen.value) {
    event.preventDefault(); openPanel();
  }
}

// DateTime clamp
function clampDateTime(dt: Temporal.PlainDateTime): Temporal.PlainDateTime {
  if (props.min && Temporal.PlainDateTime.compare(dt, props.min) < 0) return props.min;
  if (props.max && Temporal.PlainDateTime.compare(dt, props.max) > 0) return props.max;
  return dt;
}

// Actions
function clearValue(event: Event) {
  event.stopPropagation();
  modelValue.value = null;
  pendingTime.value = null;
  displayValue.value = '';
}

function onDateSelected(date: Temporal.PlainDate) {
  const time = selectedTime.value ?? props.defaultTime;
  let dt = date.toPlainDateTime({
    hour: time.hours,
    minute: coarRoundMinutesToStep(time.minutes, props.minuteStep),
  });
  dt = clampDateTime(dt);
  modelValue.value = dt;
}

function onTimeChanged(time: CoarTimeValue | null) {
  if (!time) return;
  if (selectedDate.value) {
    let dt = selectedDate.value.toPlainDateTime({ hour: time.hours, minute: time.minutes });
    dt = clampDateTime(dt);
    modelValue.value = dt;
  } else {
    pendingTime.value = time;
  }
}

function onActiveMonthChanged(ym: Temporal.PlainYearMonth) { activeMonth.value = ym; }
function selectMonth(ym: Temporal.PlainYearMonth) { activeMonth.value = ym; }
function previousYear() { if (!isPrevYearDisabled.value) activeMonth.value = activeMonth.value.subtract({ years: 1 }); }
function nextYear() { if (!isNextYearDisabled.value) activeMonth.value = activeMonth.value.add({ years: 1 }); }
function scrollToTodayMonth() { activeMonth.value = today.value.toPlainYearMonth(); }

function onInputChange(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  displayValue.value = text;
  const parsed = parseValueFromInput(text);
  if (parsed) {
    modelValue.value = parsed;
    activeMonth.value = parsed.toPlainDate().toPlainYearMonth();
  }
}

function onInputBlur() {
  const text = displayValue.value;
  const parsed = parseValueFromInput(text);
  if (!parsed && text.length > 0) {
    displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
  }
}

function parseValueFromInput(text: string): Temporal.PlainDateTime | null {
  if (!text) return null;
  const parts = text.split(' ');
  if (parts.length < 2) return null;
  const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern, { min: minDate.value, max: maxDate.value });
  if (!date) return null;
  const time = coarParseTimeInput(parts.slice(1).join(' '));
  if (!time) return null;
  return date.toPlainDateTime({ hour: time.hours, minute: time.minutes });
}
</script>

<template>
  <div
    class="coar-pdtp-wrapper"
    :class="[
      `coar-pdtp--${size}`,
      {
        'coar-pdtp--disabled': isDisabled,
        'coar-pdtp--readonly': readonly,
        'coar-pdtp--error': hasError,
        'coar-pdtp--open': pickerBase.isOpen.value,
      },
    ]"
  >
    <!-- Label -->
    <span v-if="label" :id="labelId" class="coar-pdtp-label">
      {{ label }}
      <span v-if="required" class="coar-pdtp-required" aria-hidden="true">*</span>
    </span>

    <!-- Trigger -->
    <div
      ref="triggerRef"
      class="coar-pdtp-trigger"
      :class="{
        'coar-pdtp-trigger--disabled': isDisabled,
        'coar-pdtp-trigger--readonly': readonly,
        'coar-pdtp-trigger--error': hasError,
        'coar-pdtp-trigger--open': pickerBase.isOpen.value,
      }"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      role="combobox"
    >
      <button
        type="button"
        class="coar-pdtp-clear"
        :class="{ 'coar-pdtp-clear--hidden': !showClearButton }"
        tabindex="-1"
        aria-label="Clear date"
        @click="clearValue($event)"
      >
        <CoarIcon name="x" size="auto" />
      </button>

      <input
        :id="inputId"
        ref="dateInputRef"
        type="text"
        class="coar-pdtp-input"
        :value="displayValue"
        :placeholder="inputPlaceholder"
        :disabled="isDisabled"
        :readonly="readonly"
        :aria-labelledby="label ? labelId : undefined"
        :aria-invalid="hasError"
        :aria-describedby="displayMessage ? messageId : undefined"
        autocomplete="off"
        @input="onInputChange"
        @blur="onInputBlur"
        @keydown="onKeydown"
      />

      <button
        type="button"
        class="coar-pdtp-btn"
        tabindex="-1"
        aria-label="Open picker"
        :disabled="isDisabled || readonly"
        @click="togglePanel"
      >
        <CoarIcon name="calendar" size="s" />
      </button>
    </div>

    <!-- Panel -->
    <Teleport to="body">
      <div
        v-if="pickerBase.isOpen.value"
        :id="panelId"
        ref="panelRef"
        class="coar-pdtp-panel"
        :class="{ 'coar-pdtp-panel--with-weeks': showWeekNumbers }"
        role="dialog"
        aria-modal="true"
        aria-label="Date time picker"
        :style="{
          position: 'fixed',
          top: '0px',
          left: '0px',
          transform: `translate3d(${panelLeft}px, ${panelTop}px, 0)`,
          zIndex: 'var(--coar-z-overlay, 1000)',
        }"
        @keydown.escape.prevent="closePanel"
      >
        <!-- Left: Calendar -->
        <div class="coar-pdtp-calendar-column">
          <CoarScrollableCalendar
            :model-value="selectedDate"
            :active-month="activeMonth"
            :min="minDate ?? undefined"
            :max="maxDate ?? undefined"
            :locale="pickerBase.effectiveLocale.value"
            :date-format-config="pickerBase.effectiveDateFormat.value"
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
            @click="scrollToTodayMonth"
          >
            <CoarIcon :name="todayMonthDirection === 'up' ? 'up' : 'down'" size="xs" />
          </button>
        </div>

        <!-- Right: Month List + Time Picker -->
        <div class="coar-pdtp-side-column">
          <!-- Year Stepper -->
          <div class="coar-pdtp-year-stepper">
            <button type="button" class="coar-pdtp-year-btn" :disabled="isPrevYearDisabled" aria-label="Previous year" @click="previousYear">
              <CoarIcon name="left" size="s" />
            </button>
            <span class="coar-pdtp-year">{{ currentYear }}</span>
            <button type="button" class="coar-pdtp-year-btn" :disabled="isNextYearDisabled" aria-label="Next year" @click="nextYear">
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
                  @click="selectMonth(item.yearMonth)"
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
              :locale="pickerBase.effectiveLocale.value"
              :disabled="isDisabled"
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
    </Teleport>

    <!-- Message -->
    <div
      :id="messageId"
      class="coar-form-field-message"
      :class="{ 'coar-form-field-message--error': hasError }"
      :title="displayMessage || undefined"
    >
      {{ displayMessage }}
    </div>
  </div>
</template>

<style scoped>
.coar-pdtp-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Label */
.coar-pdtp-label {
  display: block;
  margin-bottom: var(--coar-component-m-label-margin);
  font-family: var(--coar-body-small-bold-family);
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-pdtp-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

.coar-pdtp--xs .coar-pdtp-label { font-size: var(--coar-component-xs-label-font-size); margin-bottom: var(--coar-component-xs-label-margin); }
.coar-pdtp--s .coar-pdtp-label { font-size: var(--coar-component-s-label-font-size); margin-bottom: var(--coar-component-s-label-margin); }
.coar-pdtp--l .coar-pdtp-label { font-size: var(--coar-component-l-label-font-size); margin-bottom: var(--coar-component-l-label-margin); }

/* Trigger */
.coar-pdtp-trigger {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  height: var(--coar-component-m-height);
  padding: 0;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.coar-pdtp-trigger:hover:not(.coar-pdtp-trigger--disabled):not(.coar-pdtp-trigger--readonly):not(.coar-pdtp-trigger--error) {
  border-color: var(--coar-border-input-hover);
}

.coar-pdtp-trigger:focus-within {
  outline: none;
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-pdtp-trigger--open:not(.coar-pdtp-trigger--error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-pdtp-trigger--disabled { background: var(--coar-surface-input-disabled); cursor: not-allowed; opacity: 0.6; }
.coar-pdtp-trigger--readonly { cursor: default; }
.coar-pdtp-trigger--error { border-color: var(--coar-border-semantic-error-bold); }
.coar-pdtp-trigger--error:focus-within,
.coar-pdtp-trigger--error.coar-pdtp-trigger--open { box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold); }

.coar-pdtp--xs .coar-pdtp-trigger { height: var(--coar-component-xs-height); padding: 0 var(--coar-spacing-s); gap: var(--coar-spacing-xs); }
.coar-pdtp--s .coar-pdtp-trigger { height: var(--coar-component-s-height); padding: 0 var(--coar-spacing-s); }
.coar-pdtp--l .coar-pdtp-trigger { height: var(--coar-component-l-height); padding: 0 var(--coar-spacing-l); }

/* Input */
.coar-pdtp-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  outline: none;
  cursor: text;
  text-align: right;
}

.coar-pdtp-input::placeholder { color: var(--coar-text-neutral-tertiary); }
.coar-pdtp-input:disabled { cursor: not-allowed; color: var(--coar-text-neutral-disabled); }
.coar-pdtp-input:read-only { cursor: default; }

.coar-pdtp--xs .coar-pdtp-input { font-size: var(--coar-component-xs-font-size); }
.coar-pdtp--s .coar-pdtp-input { font-size: var(--coar-component-s-font-size); }
.coar-pdtp--l .coar-pdtp-input { font-size: var(--coar-component-l-font-size); }

/* Clear */
.coar-pdtp-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  margin-left: var(--coar-spacing-s);
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  transition: color 0.15s ease, opacity 0.15s ease;
  opacity: 0.4;
}

.coar-pdtp-clear--hidden { opacity: 0; pointer-events: none; }
.coar-pdtp-trigger:hover .coar-pdtp-clear:not(.coar-pdtp-clear--hidden) { opacity: 1; color: var(--coar-icon-neutral-tertiary); }
.coar-pdtp-clear:hover { color: var(--coar-icon-neutral-primary); }

/* Calendar button */
.coar-pdtp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--coar-component-m-height);
  height: 100%;
  padding: 0;
  margin: 0;
  border: none;
  border-left: 1px solid var(--coar-border-input);
  border-radius: 0 var(--coar-radius-xs) var(--coar-radius-xs) 0;
  background: var(--coar-surface-neutral-secondary);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.coar-pdtp-btn:hover:not(:disabled) { background: var(--coar-surface-neutral-tertiary); color: var(--coar-icon-neutral-primary); }
.coar-pdtp-btn:disabled { cursor: not-allowed; color: var(--coar-icon-neutral-disabled); }

.coar-pdtp--xs .coar-pdtp-btn { width: var(--coar-component-xs-height); }
.coar-pdtp--s .coar-pdtp-btn { width: var(--coar-component-s-height); }
.coar-pdtp--l .coar-pdtp-btn { width: var(--coar-component-l-height); }

/* Panel */
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
  transition: background-color 150ms ease, transform 100ms ease;
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
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
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
  transition: background-color 0.15s ease, color 0.15s ease;
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
.coar-pdtp-event-text { font-family: var(--coar-body-small-base-family); font-size: var(--coar-body-caption-size); color: var(--coar-text-neutral-primary); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.coar-pdtp-event-dates { font-family: var(--coar-body-small-base-family); font-size: var(--coar-component-xs-font-size); color: var(--coar-text-neutral-secondary); line-height: 1.2; }

/* Message */
.coar-form-field-message {
  display: block;
  margin-top: var(--coar-spacing-xs);
  height: calc(var(--coar-body-caption-size) * 1.4);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  line-height: 1.4;
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-form-field-message:empty { visibility: hidden; }
.coar-form-field-message--error { color: var(--coar-text-semantic-error-bold); }

@media (prefers-reduced-motion: reduce) {
  .coar-pdtp-trigger,
  .coar-pdtp-clear,
  .coar-pdtp-btn,
  .coar-pdtp-today-fab,
  .coar-pdtp-year-btn,
  .coar-pdtp-month-item { transition: none; }
}
</style>
