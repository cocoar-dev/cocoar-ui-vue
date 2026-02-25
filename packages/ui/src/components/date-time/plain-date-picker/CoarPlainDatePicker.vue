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
import { Maskito } from '@maskito/core';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarScrollableCalendar from '../scrollable-calendar/CoarScrollableCalendar.vue';
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
  coarTemporalPlainDateToDate,
} from '../_shared/date-helpers';
import { coarCreateDateMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker } from '../_shared/types';
import { COAR_DATE_FORMAT_TO_MASKITO_MODE } from '../_shared/types';

export type CoarPlainDatePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    /** Label text above the input */
    label?: string;
    /** Placeholder (defaults to format pattern) */
    placeholder?: string;
    /** Size variant */
    size?: CoarPlainDatePickerSize;
    /** Disabled state */
    disabled?: boolean;
    /** Readonly state */
    readonly?: boolean;
    /** Required state */
    required?: boolean;
    /** Error message */
    error?: string;
    /** Hint text */
    hint?: string;
    /** Whether the clear button is shown */
    clearable?: boolean;
    /** Whether to close the panel after date selection */
    closeOnSelect?: boolean;
    /** Show week numbers in calendar */
    showWeekNumbers?: boolean;
    /** Highlight weekend days */
    highlightWeekends?: boolean;
    /** Date markers */
    markers?: CoarDateMarker[];
    /** Locale override */
    locale?: string;
    /** Date format configuration override */
    dateFormat?: DateFormatConfig;
    /** Minimum selectable date */
    min?: Temporal.PlainDate | null;
    /** Maximum selectable date */
    max?: Temporal.PlainDate | null;
    /** Show today-month FAB */
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
    closeOnSelect: false,
    showWeekNumbers: false,
    highlightWeekends: false,
    markers: () => [],
    locale: undefined,
    dateFormat: undefined,
    min: null,
    max: null,
    showTodayMonthButton: true,
  },
);

const modelValue = defineModel<Temporal.PlainDate | null>({ default: null });

const emit = defineEmits<{
  opened: [];
  closed: [];
}>();

// Date picker base composable
const localeRef = computed(() => props.locale);
const dateFormatRef = computed(() => props.dateFormat);
const pickerBase = useDatePickerBase({ locale: localeRef, dateFormat: dateFormatRef });

// Active month for calendar + month list sync
const activeMonth = ref<Temporal.PlainYearMonth>(
  modelValue.value?.toPlainYearMonth() ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
);

// IDs
let instanceId = 0;
const uid = `coar-plain-date-picker-${instanceId++}`;
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

// Maskito
let maskitoInstance: Maskito | undefined;

function initMaskito() {
  maskitoInstance?.destroy();
  if (!dateInputRef.value) return;
  const mask = coarCreateDateMask(pickerBase.effectiveDateFormat.value.pattern);
  maskitoInstance = new Maskito(dateInputRef.value, mask);
}

// Sync display value from model
watch(
  modelValue,
  (val) => {
    if (val) {
      displayValue.value = coarFormatPlainDate(val, pickerBase.effectiveDateFormat.value.pattern);
    } else {
      displayValue.value = '';
    }
  },
  { immediate: true },
);

// Init maskito when input is available and format changes
watch(
  [dateInputRef, () => pickerBase.effectiveDateFormat.value],
  () => {
    nextTick(() => initMaskito());
  },
);

onBeforeUnmount(() => {
  maskitoInstance?.destroy();
});

// Computed
const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);
const isDisabled = computed(() => props.disabled);
const showClearButton = computed(
  () => props.clearable && modelValue.value !== null && !isDisabled.value && !props.readonly,
);
const inputPlaceholder = computed(
  () => props.placeholder || pickerBase.effectiveDateFormat.value.pattern.toUpperCase(),
);

// Month list (4-column grid with short names)
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

// Today month FAB
const today = computed(() => Temporal.Now.plainDateISO());
const todayMonthDirection = computed((): 'up' | 'down' | 'hidden' => {
  const cmp = Temporal.PlainYearMonth.compare(activeMonth.value, today.value.toPlainYearMonth());
  if (cmp === 0) return 'hidden';
  return cmp > 0 ? 'up' : 'down';
});
const showTodayFab = computed(
  () => props.showTodayMonthButton && todayMonthDirection.value !== 'hidden',
);

// Selected date markers
const selectedDateMarkers = computed((): CoarDateMarker[] => {
  const date = modelValue.value;
  if (!date) return [];
  return props.markers.filter((m) => {
    const afterStart = Temporal.PlainDate.compare(date, m.startDate) >= 0;
    const beforeEnd = m.endDate
      ? Temporal.PlainDate.compare(date, m.endDate) <= 0
      : Temporal.PlainDate.compare(date, m.startDate) === 0;
    return afterStart && beforeEnd;
  });
});

// Panel positioning
const panelLeft = ref(0);
const panelTop = ref(0);
const panelPlacement = ref<string>('bottom-start');

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
  const coords = computeOverlayCoordinates(
    anchorRect,
    { width: panelRect.width, height: panelRect.height },
    positionSpec,
    viewport,
  );
  panelLeft.value = Math.round(coords.left);
  panelTop.value = Math.round(coords.top);
  panelPlacement.value = coords.placement;
}

function scheduleReposition() {
  if (rafId != null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (pickerBase.isOpen.value) repositionPanel();
  });
}

function installListeners() {
  if (!triggerRef.value) return;
  scrollParents = getScrollParents(triggerRef.value);
  for (const sp of scrollParents) {
    sp.addEventListener('scroll', scheduleReposition, { passive: true });
  }
  window.addEventListener('resize', scheduleReposition, { passive: true });
  resizeObserver = new ResizeObserver(scheduleReposition);
  resizeObserver.observe(triggerRef.value);
}

function removeListeners() {
  for (const sp of scrollParents) {
    sp.removeEventListener('scroll', scheduleReposition);
  }
  scrollParents = [];
  window.removeEventListener('resize', scheduleReposition);
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// Open/close
function openPanel() {
  if (isDisabled.value || props.readonly) return;
  if (pickerBase.isOpen.value) return;

  // Reset activeMonth to current value or today
  if (modelValue.value) {
    activeMonth.value = modelValue.value.toPlainYearMonth();
  }

  pickerBase.open();
  emit('opened');
  nextTick(() => {
    requestAnimationFrame(() => {
      repositionPanel();
      installListeners();
    });
  });
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
  if (triggerRef.value?.contains(target)) return;
  if (panelRef.value?.contains(target)) return;
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

// Escape key
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && pickerBase.isOpen.value) {
    event.preventDefault();
    closePanel();
    dateInputRef.value?.focus();
  } else if ((event.key === 'Enter' || event.key === 'ArrowDown') && !pickerBase.isOpen.value) {
    event.preventDefault();
    openPanel();
  }
}

// Actions
function clearValue(event: Event) {
  event.stopPropagation();
  modelValue.value = null;
  displayValue.value = '';
}

function onDateSelected(date: Temporal.PlainDate) {
  modelValue.value = date;
  if (props.closeOnSelect) {
    closePanel();
  }
}

function onActiveMonthChanged(ym: Temporal.PlainYearMonth) {
  activeMonth.value = ym;
}

function selectMonth(ym: Temporal.PlainYearMonth) {
  activeMonth.value = ym;
}

function previousYear() {
  if (isPrevYearDisabled.value) return;
  activeMonth.value = activeMonth.value.subtract({ years: 1 });
}

function nextYear() {
  if (isNextYearDisabled.value) return;
  activeMonth.value = activeMonth.value.add({ years: 1 });
}

function scrollToTodayMonth() {
  activeMonth.value = today.value.toPlainYearMonth();
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  displayValue.value = input.value;

  const parsed = coarParsePlainDateFromInput(input.value, pickerBase.effectiveDateFormat.value.pattern, {
    min: props.min,
    max: props.max,
  });
  if (parsed) {
    modelValue.value = parsed;
    activeMonth.value = parsed.toPlainYearMonth();
  }
}

function onInputBlur() {
  const text = displayValue.value;
  const parsed = coarParsePlainDateFromInput(text, pickerBase.effectiveDateFormat.value.pattern, {
    min: props.min,
    max: props.max,
  });
  if (!parsed && text.length > 0) {
    if (modelValue.value) {
      displayValue.value = coarFormatPlainDate(modelValue.value, pickerBase.effectiveDateFormat.value.pattern);
    } else {
      displayValue.value = '';
    }
  }
}
</script>

<template>
  <div
    class="coar-plain-date-picker-wrapper"
    :class="[
      `coar-plain-date-picker--${size}`,
      {
        'coar-plain-date-picker--disabled': isDisabled,
        'coar-plain-date-picker--readonly': readonly,
        'coar-plain-date-picker--error': hasError,
        'coar-plain-date-picker--open': pickerBase.isOpen.value,
      },
    ]"
  >
    <!-- Label -->
    <span v-if="label" class="coar-plain-date-picker-label" :id="labelId">
      {{ label }}
      <span v-if="required" class="coar-plain-date-picker-required" aria-hidden="true">*</span>
    </span>

    <!-- Trigger -->
    <div
      ref="triggerRef"
      class="coar-plain-date-picker-trigger"
      :class="{
        'coar-plain-date-picker-trigger--disabled': isDisabled,
        'coar-plain-date-picker-trigger--readonly': readonly,
        'coar-plain-date-picker-trigger--error': hasError,
        'coar-plain-date-picker-trigger--open': pickerBase.isOpen.value,
      }"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      role="combobox"
    >
      <!-- Clear Button -->
      <button
        type="button"
        class="coar-plain-date-picker-clear"
        :class="{ 'coar-plain-date-picker-clear--hidden': !showClearButton }"
        tabindex="-1"
        aria-label="Clear date"
        @click="clearValue($event)"
      >
        <CoarIcon name="x" size="auto" />
      </button>

      <!-- Input -->
      <input
        ref="dateInputRef"
        type="text"
        class="coar-plain-date-picker-input"
        :id="inputId"
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

      <!-- Calendar Icon -->
      <button
        type="button"
        class="coar-plain-date-picker-btn"
        tabindex="-1"
        aria-label="Open picker"
        :disabled="isDisabled || readonly"
        @click="togglePanel"
      >
        <CoarIcon name="calendar" size="s" />
      </button>
    </div>

    <!-- Panel (Teleported) -->
    <Teleport to="body">
      <div
        v-if="pickerBase.isOpen.value"
        ref="panelRef"
        class="coar-plain-date-picker-panel"
        :class="{ 'coar-plain-date-picker-panel--with-weeks': showWeekNumbers }"
        :id="panelId"
        role="dialog"
        aria-modal="true"
        aria-label="Date picker"
        :style="{
          position: 'fixed',
          top: '0px',
          left: '0px',
          transform: `translate3d(${panelLeft}px, ${panelTop}px, 0)`,
          zIndex: 'var(--coar-z-overlay, 1000)',
        }"
        @keydown.escape.prevent="closePanel"
      >
        <!-- Left Column: Calendar -->
        <div class="coar-plain-date-picker-calendar-column">
          <CoarScrollableCalendar
            :modelValue="modelValue"
            :activeMonth="activeMonth"
            @update:activeMonth="onActiveMonthChanged"
            :min="min ?? undefined"
            :max="max ?? undefined"
            :locale="pickerBase.effectiveLocale.value"
            :dateFormatConfig="pickerBase.effectiveDateFormat.value"
            :showWeekNumbers="showWeekNumbers"
            :highlightWeekends="highlightWeekends"
            :markers="markers"
            @dateSelected="onDateSelected"
          />

          <button
            v-if="showTodayFab"
            type="button"
            class="coar-plain-date-picker-today-fab"
            aria-label="Jump to today's month"
            @click="scrollToTodayMonth"
          >
            <CoarIcon :name="todayMonthDirection === 'up' ? 'up' : 'down'" size="xs" />
          </button>
        </div>

        <!-- Right Column: Month List -->
        <div class="coar-plain-date-picker-side-column">
          <!-- Year Stepper -->
          <div class="coar-plain-date-picker-year-stepper">
            <button
              type="button"
              class="coar-plain-date-picker-year-btn"
              :disabled="isPrevYearDisabled"
              aria-label="Previous year"
              @click="previousYear"
            >
              <CoarIcon name="left" size="s" />
            </button>
            <span class="coar-plain-date-picker-year">{{ currentYear }}</span>
            <button
              type="button"
              class="coar-plain-date-picker-year-btn"
              :disabled="isNextYearDisabled"
              aria-label="Next year"
              @click="nextYear"
            >
              <CoarIcon name="right" size="s" />
            </button>
          </div>

          <!-- Month Grid (4-col) -->
          <div class="coar-plain-date-picker-month-list-wrapper">
            <div class="coar-plain-date-picker-month-list" role="listbox" aria-label="Months">
              <div class="coar-plain-date-picker-month-list-content">
                <button
                  v-for="item in monthItems"
                  :key="item.month"
                  type="button"
                  class="coar-plain-date-picker-month-item"
                  :class="{ 'coar-plain-date-picker-month-item--active': item.isActive }"
                  role="option"
                  :aria-selected="item.isActive"
                  @click="selectMonth(item.yearMonth)"
                >
                  {{ item.name }}
                </button>
              </div>
            </div>
          </div>

          <!-- Events Section (markers for selected date) -->
          <div v-if="selectedDateMarkers.length > 0" class="coar-plain-date-picker-events">
            <div class="coar-plain-date-picker-events-list">
              <div class="coar-plain-date-picker-events-content">
                <div
                  v-for="marker in selectedDateMarkers"
                  :key="marker.description"
                  class="coar-plain-date-picker-event-item"
                >
                  <span class="coar-plain-date-picker-event-dot" />
                  <div class="coar-plain-date-picker-event-details">
                    <span class="coar-plain-date-picker-event-text">{{ marker.description }}</span>
                    <span
                      v-if="marker.endDate && !marker.startDate.equals(marker.endDate)"
                      class="coar-plain-date-picker-event-dates"
                    >
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

    <!-- Hint/Error Message -->
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
.coar-plain-date-picker-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* ========================================
   LABEL
   ======================================== */

.coar-plain-date-picker-label {
  display: block;
  margin-bottom: var(--coar-component-m-label-margin);
  font-family: var(--coar-body-small-bold-family);
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-plain-date-picker-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

.coar-plain-date-picker--xs .coar-plain-date-picker-label {
  font-size: var(--coar-component-xs-label-font-size);
  margin-bottom: var(--coar-component-xs-label-margin);
}

.coar-plain-date-picker--s .coar-plain-date-picker-label {
  font-size: var(--coar-component-s-label-font-size);
  margin-bottom: var(--coar-component-s-label-margin);
}

.coar-plain-date-picker--l .coar-plain-date-picker-label {
  font-size: var(--coar-component-l-label-font-size);
  margin-bottom: var(--coar-component-l-label-margin);
}

/* ========================================
   TRIGGER
   ======================================== */

.coar-plain-date-picker-trigger {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  height: var(--coar-component-m-height);
  padding: 0;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.coar-plain-date-picker-trigger:hover:not(
    .coar-plain-date-picker-trigger--disabled
  ):not(
    .coar-plain-date-picker-trigger--readonly
  ):not(
    .coar-plain-date-picker-trigger--error
  ) {
  border-color: var(--coar-border-input-hover);
}

.coar-plain-date-picker-trigger:focus-within {
  outline: none;
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-plain-date-picker-trigger--open:not(.coar-plain-date-picker-trigger--error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-plain-date-picker-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-plain-date-picker-trigger--readonly {
  cursor: default;
}

.coar-plain-date-picker-trigger--error {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-plain-date-picker-trigger--error:focus-within,
.coar-plain-date-picker-trigger--error.coar-plain-date-picker-trigger--open {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

/* Size variants */
.coar-plain-date-picker--xs .coar-plain-date-picker-trigger {
  height: var(--coar-component-xs-height);
  padding: 0 var(--coar-spacing-s);
  gap: var(--coar-spacing-xs);
}

.coar-plain-date-picker--s .coar-plain-date-picker-trigger {
  height: var(--coar-component-s-height);
  padding: 0 var(--coar-spacing-s);
}

.coar-plain-date-picker--l .coar-plain-date-picker-trigger {
  height: var(--coar-component-l-height);
  padding: 0 var(--coar-spacing-l);
}

/* ========================================
   INPUT
   ======================================== */

.coar-plain-date-picker-input {
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

.coar-plain-date-picker-input::placeholder {
  color: var(--coar-text-neutral-tertiary);
}

.coar-plain-date-picker-input:disabled {
  cursor: not-allowed;
  color: var(--coar-text-neutral-disabled);
}

.coar-plain-date-picker-input:read-only {
  cursor: default;
}

.coar-plain-date-picker--xs .coar-plain-date-picker-input {
  font-size: var(--coar-component-xs-font-size);
}

.coar-plain-date-picker--s .coar-plain-date-picker-input {
  font-size: var(--coar-component-s-font-size);
}

.coar-plain-date-picker--l .coar-plain-date-picker-input {
  font-size: var(--coar-component-l-font-size);
}

/* ========================================
   CLEAR BUTTON
   ======================================== */

.coar-plain-date-picker-clear {
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
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
  opacity: 0.4;
}

.coar-plain-date-picker-clear--hidden {
  opacity: 0;
  pointer-events: none;
}

.coar-plain-date-picker-trigger:hover .coar-plain-date-picker-clear:not(.coar-plain-date-picker-clear--hidden) {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-plain-date-picker-clear:hover {
  color: var(--coar-icon-neutral-primary);
}

/* ========================================
   CALENDAR BUTTON
   ======================================== */

.coar-plain-date-picker-btn {
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
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.coar-plain-date-picker-btn:hover:not(:disabled) {
  background: var(--coar-surface-neutral-tertiary);
  color: var(--coar-icon-neutral-primary);
}

.coar-plain-date-picker-btn:disabled {
  cursor: not-allowed;
  color: var(--coar-icon-neutral-disabled);
}

.coar-plain-date-picker--xs .coar-plain-date-picker-btn {
  width: var(--coar-component-xs-height);
}

.coar-plain-date-picker--s .coar-plain-date-picker-btn {
  width: var(--coar-component-s-height);
}

.coar-plain-date-picker--l .coar-plain-date-picker-btn {
  width: var(--coar-component-l-height);
}

/* ========================================
   PANEL
   ======================================== */

.coar-plain-date-picker-panel {
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

.coar-plain-date-picker-panel--with-weeks {
  min-width: 528px;
  max-width: 648px;
}

/* ========================================
   CALENDAR COLUMN
   ======================================== */

.coar-plain-date-picker-calendar-column {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--coar-background-neutral-primary);
}

.coar-plain-date-picker-today-fab {
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
  transition:
    background-color 150ms ease,
    transform 100ms ease;
  z-index: 10;
}

.coar-plain-date-picker-today-fab:hover {
  transform: scale(1.05);
}

.coar-plain-date-picker-today-fab:active {
  transform: scale(0.95);
}

/* ========================================
   SIDE COLUMN
   ======================================== */

.coar-plain-date-picker-side-column {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  background: var(--coar-background-neutral-secondary);
}

/* ========================================
   YEAR STEPPER
   ======================================== */

.coar-plain-date-picker-year-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  padding: var(--coar-spacing-s);
  flex-shrink: 0;
}

.coar-plain-date-picker-year-btn {
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
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

.coar-plain-date-picker-year-btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-icon-neutral-primary);
  opacity: 1;
}

.coar-plain-date-picker-year-btn:disabled {
  color: var(--coar-icon-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.35;
}

.coar-plain-date-picker-year {
  flex: 1;
  text-align: center;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-bold-weight);
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

/* ========================================
   MONTH LIST (4-col grid)
   ======================================== */

.coar-plain-date-picker-month-list-wrapper {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.coar-plain-date-picker-month-list {
  flex: 1;
}

.coar-plain-date-picker-month-list-content {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--coar-spacing-xxs, 2px) var(--coar-spacing-xxs, 2px);
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
}

.coar-plain-date-picker-month-item {
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
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.coar-plain-date-picker-month-item:hover {
  background: var(--coar-background-neutral-tertiary);
}

.coar-plain-date-picker-month-item--active {
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-body-small-bold-weight);
}

/* ========================================
   EVENTS SECTION
   ======================================== */

.coar-plain-date-picker-events {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--coar-border-neutral-quaternary);
  margin-bottom: 4px;
}

.coar-plain-date-picker-events-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 var(--coar-spacing-s) var(--coar-spacing-s);
  flex: 1;
  min-height: 0;
}

.coar-plain-date-picker-events-content {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
}

.coar-plain-date-picker-event-item {
  display: flex;
  align-items: flex-start;
  gap: var(--coar-spacing-xs);
}

.coar-plain-date-picker-event-dot {
  width: 6px;
  height: 6px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--coar-text-accent-primary);
  flex-shrink: 0;
}

.coar-plain-date-picker-event-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.coar-plain-date-picker-event-text {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-plain-date-picker-event-dates {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-component-xs-font-size);
  color: var(--coar-text-neutral-secondary);
  line-height: 1.2;
}

/* ========================================
   MESSAGE
   ======================================== */

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

.coar-form-field-message:empty {
  visibility: hidden;
}

.coar-form-field-message--error {
  color: var(--coar-text-semantic-error-bold);
}

@media (prefers-reduced-motion: reduce) {
  .coar-plain-date-picker-trigger,
  .coar-plain-date-picker-clear,
  .coar-plain-date-picker-btn,
  .coar-plain-date-picker-today-fab,
  .coar-plain-date-picker-year-btn,
  .coar-plain-date-picker-month-item {
    transition: none;
  }
}
</style>
