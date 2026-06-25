<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  markRaw,
} from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { Maskito } from '@maskito/core';

import { useI18n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import { getOverlayService } from '../../overlay/useOverlay';
import { datepickerPreset } from '../../overlay/overlay-presets';
import type { OverlayRef } from '../../overlay/overlay-types';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import {
  coarFormatPlainDate,
  coarParsePlainDateFromInput,
} from '../_shared/date-helpers';
import { coarCreateDateMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker } from '../_shared/types';
import CoarPlainDatePickerPanel from './CoarPlainDatePickerPanel.vue';

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

// i18n
const { t } = useI18n();

// Date picker base composable
const localeRef = computed(() => props.locale);
const dateFormatRef = computed(() => props.dateFormat);
const pickerBase = useDatePickerBase({ locale: localeRef, dateFormat: dateFormatRef });

// Active month for calendar + month list sync
const activeMonth = ref<Temporal.PlainYearMonth>(
  modelValue.value?.toPlainYearMonth() ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
);

// IDs
const uid = `coar-plain-date-picker-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const labelId = `${uid}-label`;
const inputId = `${uid}-input`;
const panelId = `${uid}-panel`;
const messageId = `${uid}-message`;

// Refs
const triggerRef = ref<HTMLElement | null>(null);
const dateInputRef = ref<HTMLInputElement | null>(null);

// Overlay
let overlayRef: OverlayRef | null = null;

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
  if (overlayRef && !overlayRef.isClosed) {
    overlayRef.close();
    overlayRef = null;
  }
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

// Year boundary helpers (needed for panel callbacks)
const isPrevYearDisabled = computed(() => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100);
const isNextYearDisabled = computed(() => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50);
const today = computed(() => Temporal.Now.plainDateISO());

// Open/close
function openPanel() {
  if (isDisabled.value || props.readonly) return;
  if (pickerBase.isOpen.value) return;

  // Reset activeMonth to current value or today
  if (modelValue.value) {
    activeMonth.value = modelValue.value.toPlainYearMonth();
  }

  const trigger = triggerRef.value;
  if (!trigger) return;

  const panelInputs = reactive({
    modelValue: modelValue.value,
    activeMonth: activeMonth.value,
    min: props.min,
    max: props.max,
    locale: pickerBase.effectiveLocale.value,
    dateFormatConfig: pickerBase.effectiveDateFormat.value,
    showWeekNumbers: props.showWeekNumbers,
    highlightWeekends: props.highlightWeekends,
    markers: props.markers,
    showTodayMonthButton: props.showTodayMonthButton,
    onDateSelected: (date: Temporal.PlainDate) => {
      modelValue.value = date;
      if (props.closeOnSelect) {
        closePanel();
      }
    },
    onActiveMonthChanged: (ym: Temporal.PlainYearMonth) => {
      activeMonth.value = ym;
    },
    onSelectMonth: (ym: Temporal.PlainYearMonth) => {
      activeMonth.value = ym;
    },
    onPreviousYear: () => {
      if (!isPrevYearDisabled.value) activeMonth.value = activeMonth.value.subtract({ years: 1 });
    },
    onNextYear: () => {
      if (!isNextYearDisabled.value) activeMonth.value = activeMonth.value.add({ years: 1 });
    },
    onScrollToTodayMonth: () => {
      activeMonth.value = today.value.toPlainYearMonth();
    },
  });

  // Sync parent state → panel inputs
  const stopWatchers: Array<() => void> = [];
  stopWatchers.push(watch(modelValue, (v) => { panelInputs.modelValue = v; }));
  stopWatchers.push(watch(activeMonth, (v) => { panelInputs.activeMonth = v; }));
  stopWatchers.push(watch(() => props.min, (v) => { panelInputs.min = v; }));
  stopWatchers.push(watch(() => props.max, (v) => { panelInputs.max = v; }));
  stopWatchers.push(watch(() => pickerBase.effectiveLocale.value, (v) => { panelInputs.locale = v; }));
  stopWatchers.push(watch(() => pickerBase.effectiveDateFormat.value, (v) => { panelInputs.dateFormatConfig = v; }));
  stopWatchers.push(watch(() => props.showWeekNumbers, (v) => { panelInputs.showWeekNumbers = v; }));
  stopWatchers.push(watch(() => props.highlightWeekends, (v) => { panelInputs.highlightWeekends = v; }));
  stopWatchers.push(watch(() => props.markers, (v) => { panelInputs.markers = v; }));
  stopWatchers.push(watch(() => props.showTodayMonthButton, (v) => { panelInputs.showTodayMonthButton = v; }));

  overlayRef = getOverlayService().open({
    spec: {
      ...datepickerPreset,
      anchor: { kind: 'element', element: trigger },
      a11y: { role: 'dialog', label: t('coar.ui.datePicker.dialog', undefined, 'Date picker') },
    },
    content: { kind: 'component', component: markRaw(CoarPlainDatePickerPanel) },
    inputs: panelInputs,
  });

  pickerBase.open();
  emit('opened');

  overlayRef.afterClosed.then(() => {
    stopWatchers.forEach((stop) => stop());
    overlayRef = null;
    if (pickerBase.isOpen.value) {
      pickerBase.close();
      emit('closed');
    }
  });
}

function closePanel() {
  if (!pickerBase.isOpen.value) return;
  overlayRef?.close();
  // afterClosed handler will do the rest
}

function togglePanel() {
  if (pickerBase.isOpen.value) {
    closePanel();
  } else {
    openPanel();
  }
}

onMounted(() => {
  nextTick(() => initMaskito());
});

// Keyboard
function onKeydown(event: KeyboardEvent) {
  if ((event.key === 'Enter' || event.key === 'ArrowDown') && !pickerBase.isOpen.value) {
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
    <span v-if="label" :id="labelId" class="coar-plain-date-picker-label">
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
        :aria-label="t('coar.ui.datePicker.clearDate', undefined, 'Clear date')"
        @click="clearValue($event)"
      >
        <CoarIcon name="x" size="auto" />
      </button>

      <!-- Input -->
      <input
        :id="inputId"
        ref="dateInputRef"
        type="text"
        class="coar-plain-date-picker-input"
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
        :aria-label="t('coar.ui.datePicker.openPicker', undefined, 'Open picker')"
        :disabled="isDisabled || readonly"
        @click="togglePanel"
      >
        <CoarIcon name="calendar" size="s" />
      </button>
    </div>

    <!-- Hint/Error Message -->
    <div
      v-if="displayMessage"
      :id="messageId"
      class="coar-form-field-message"
      :class="{ 'coar-form-field-message--error': hasError }"
      :title="displayMessage"
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
  /* Field contract: --coar-field-pad = base × per-size scale × density. Applied
     to the inner input (the date is right-aligned, so padding-right is the
     visible text↔button gap); the trigger itself stays flush so the calendar
     segment-button fills the edge. */
  --coar-field-pad: calc(var(--coar-field-padding-x) * var(--coar-component-scale, 1) * var(--coar-component-density, 1));
  padding: 0;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
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
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-plain-date-picker-trigger--open:not(.coar-plain-date-picker-trigger--error) {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
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
  gap: var(--coar-spacing-xs);
  --coar-component-scale: var(--coar-component-xs-scale);
}

.coar-plain-date-picker--s .coar-plain-date-picker-trigger {
  height: var(--coar-component-s-height);
  --coar-component-scale: var(--coar-component-s-scale);
}

.coar-plain-date-picker--l .coar-plain-date-picker-trigger {
  height: var(--coar-component-l-height);
  --coar-component-scale: var(--coar-component-l-scale);
}

/* ========================================
   INPUT
   ======================================== */

.coar-plain-date-picker-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--coar-field-pad);
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  outline: none;
  cursor: text;
  text-align: right;
}

.coar-plain-date-picker-input::placeholder {
  color: var(--coar-text-placeholder);
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
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
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
  border-radius: 0 var(--coar-input-radius) var(--coar-input-radius) 0;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-plain-date-picker-btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
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
   MESSAGE
   ======================================== */

.coar-form-field-message {
  display: block;
  margin-top: var(--coar-spacing-xs);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  line-height: var(--coar-line-height-normal);
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-form-field-message--error {
  color: var(--coar-text-semantic-error-bold);
}

@media (prefers-reduced-motion: reduce) {
  .coar-plain-date-picker-trigger,
  .coar-plain-date-picker-clear,
  .coar-plain-date-picker-btn {
    transition: none;
  }
}
</style>
