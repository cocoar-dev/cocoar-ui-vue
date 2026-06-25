<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, markRaw } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { Maskito } from '@maskito/core';

import { useI18n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import { getOverlayService } from '../../overlay/useOverlay';
import { datepickerPreset } from '../../overlay/overlay-presets';
import type { OverlayRef } from '../../overlay/overlay-types';
import { useDatePickerBase } from '../_shared/use-date-picker-base';
import { coarFormatPlainDate, coarParsePlainDateFromInput } from '../_shared/date-helpers';
import {
  coarFormatTime,
  coarParseTimeInput,
  coarDetect12HourFormat,
  coarRoundMinutesToStep,
} from '../_shared/time-helpers';
import { coarCreateDateTimeMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker, CoarTimeValue } from '../_shared/types';
import CoarPlainDateTimePickerPanel from './CoarPlainDateTimePickerPanel.vue';

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

// i18n
const { t } = useI18n();

// Composable
const localeRef = computed(() => props.locale);
const dateFormatRef = computed(() => props.dateFormat);
const pickerBase = useDatePickerBase({ locale: localeRef, dateFormat: dateFormatRef });

// Active month
const activeMonth = ref<Temporal.PlainYearMonth>(
  modelValue.value?.toPlainDate().toPlainYearMonth() ??
    Temporal.Now.plainDateISO().toPlainYearMonth(),
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
const dateInputRef = ref<HTMLInputElement | null>(null);

// Overlay
let overlayRef: OverlayRef | null = null;

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
  const datePart = coarFormatPlainDate(
    val.toPlainDate(),
    pickerBase.effectiveDateFormat.value.pattern,
  );
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

// Year boundary helpers
const isPrevYearDisabled = computed(
  () => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100,
);
const isNextYearDisabled = computed(
  () => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50,
);
const today = computed(() => Temporal.Now.plainDateISO());

// DateTime clamp
function clampDateTime(dt: Temporal.PlainDateTime): Temporal.PlainDateTime {
  if (props.min && Temporal.PlainDateTime.compare(dt, props.min) < 0) return props.min;
  if (props.max && Temporal.PlainDateTime.compare(dt, props.max) > 0) return props.max;
  return dt;
}

// Open/close
function openPanel() {
  if (isDisabled.value || props.readonly || pickerBase.isOpen.value) return;
  if (modelValue.value) activeMonth.value = modelValue.value.toPlainDate().toPlainYearMonth();

  const trigger = triggerRef.value;
  if (!trigger) return;

  const panelInputs = reactive({
    modelValue: selectedDate.value,
    activeMonth: activeMonth.value,
    min: minDate.value,
    max: maxDate.value,
    locale: pickerBase.effectiveLocale.value,
    dateFormatConfig: pickerBase.effectiveDateFormat.value,
    showWeekNumbers: props.showWeekNumbers,
    highlightWeekends: props.highlightWeekends,
    markers: props.markers,
    showTodayMonthButton: props.showTodayMonthButton,
    selectedTime: selectedTime.value,
    use24Hour: props.use24Hour,
    minuteStep: props.minuteStep,
    disabled: props.disabled,
    readonly: props.readonly as boolean,
    effectiveMinTime: effectiveMinTime.value,
    effectiveMaxTime: effectiveMaxTime.value,
    onDateSelected: (date: Temporal.PlainDate) => {
      const time = selectedTime.value ?? props.defaultTime;
      let dt = date.toPlainDateTime({
        hour: time.hours,
        minute: coarRoundMinutesToStep(time.minutes, props.minuteStep),
      });
      dt = clampDateTime(dt);
      modelValue.value = dt;
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
    onTimeChanged: (time: CoarTimeValue | null) => {
      if (!time) return;
      if (selectedDate.value) {
        let dt = selectedDate.value.toPlainDateTime({ hour: time.hours, minute: time.minutes });
        dt = clampDateTime(dt);
        modelValue.value = dt;
      } else {
        pendingTime.value = time;
      }
    },
  });

  // Sync parent state → panel inputs
  const stopWatchers: Array<() => void> = [];
  stopWatchers.push(
    watch(selectedDate, (v) => {
      panelInputs.modelValue = v;
    }),
  );
  stopWatchers.push(
    watch(activeMonth, (v) => {
      panelInputs.activeMonth = v;
    }),
  );
  stopWatchers.push(
    watch(minDate, (v) => {
      panelInputs.min = v;
    }),
  );
  stopWatchers.push(
    watch(maxDate, (v) => {
      panelInputs.max = v;
    }),
  );
  stopWatchers.push(
    watch(
      () => pickerBase.effectiveLocale.value,
      (v) => {
        panelInputs.locale = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => pickerBase.effectiveDateFormat.value,
      (v) => {
        panelInputs.dateFormatConfig = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.showWeekNumbers,
      (v) => {
        panelInputs.showWeekNumbers = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.highlightWeekends,
      (v) => {
        panelInputs.highlightWeekends = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.markers,
      (v) => {
        panelInputs.markers = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.showTodayMonthButton,
      (v) => {
        panelInputs.showTodayMonthButton = v;
      },
    ),
  );
  stopWatchers.push(
    watch(selectedTime, (v) => {
      panelInputs.selectedTime = v;
    }),
  );
  stopWatchers.push(
    watch(
      () => props.use24Hour,
      (v) => {
        panelInputs.use24Hour = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.minuteStep,
      (v) => {
        panelInputs.minuteStep = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.disabled,
      (v) => {
        panelInputs.disabled = v;
      },
    ),
  );
  stopWatchers.push(
    watch(
      () => props.readonly,
      (v) => {
        panelInputs.readonly = v;
      },
    ),
  );
  stopWatchers.push(
    watch(effectiveMinTime, (v) => {
      panelInputs.effectiveMinTime = v;
    }),
  );
  stopWatchers.push(
    watch(effectiveMaxTime, (v) => {
      panelInputs.effectiveMaxTime = v;
    }),
  );

  overlayRef = getOverlayService().open({
    spec: {
      ...datepickerPreset,
      anchor: { kind: 'element', element: trigger },
      a11y: { role: 'dialog', label: t('coar.ui.dateTimePicker.dialog', undefined, 'Date time picker') },
    },
    content: { kind: 'component', component: markRaw(CoarPlainDateTimePickerPanel) },
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
  pendingTime.value = null;
  displayValue.value = '';
}

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
  const date = coarParsePlainDateFromInput(parts[0], pickerBase.effectiveDateFormat.value.pattern, {
    min: minDate.value,
    max: maxDate.value,
  });
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
        :aria-label="t('coar.ui.dateTimePicker.clearDate', undefined, 'Clear date')"
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
        :aria-label="t('coar.ui.dateTimePicker.openPicker', undefined, 'Open picker')"
        :disabled="isDisabled || readonly"
        @click="togglePanel"
      >
        <CoarIcon name="calendar" size="s" />
      </button>
    </div>

    <!-- Message -->
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

.coar-pdtp--xs .coar-pdtp-label {
  font-size: var(--coar-component-xs-label-font-size);
  margin-bottom: var(--coar-component-xs-label-margin);
}
.coar-pdtp--s .coar-pdtp-label {
  font-size: var(--coar-component-s-label-font-size);
  margin-bottom: var(--coar-component-s-label-margin);
}
.coar-pdtp--l .coar-pdtp-label {
  font-size: var(--coar-component-l-label-font-size);
  margin-bottom: var(--coar-component-l-label-margin);
}

/* Trigger */
.coar-pdtp-trigger {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  height: var(--coar-component-m-height);
  /* Field contract: horizontal padding = base × per-size scale × density. */
  /* field-pad applied to the inner input (right-aligned date → padding-right is
     the visible text↔button gap); trigger stays flush for the edge button. */
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

.coar-pdtp-trigger:hover:not(.coar-pdtp-trigger--disabled):not(.coar-pdtp-trigger--readonly):not(
    .coar-pdtp-trigger--error
  ) {
  border-color: var(--coar-border-input-hover);
}

.coar-pdtp-trigger:focus-within {
  outline: none;
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-pdtp-trigger--open:not(.coar-pdtp-trigger--error) {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-pdtp-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}
.coar-pdtp-trigger--readonly {
  cursor: default;
}
.coar-pdtp-trigger--error {
  border-color: var(--coar-border-semantic-error-bold);
}
.coar-pdtp-trigger--error:focus-within,
.coar-pdtp-trigger--error.coar-pdtp-trigger--open {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-pdtp--xs .coar-pdtp-trigger {
  height: var(--coar-component-xs-height);
  gap: var(--coar-spacing-xs);
  --coar-component-scale: var(--coar-component-xs-scale);
}
.coar-pdtp--s .coar-pdtp-trigger {
  height: var(--coar-component-s-height);
  --coar-component-scale: var(--coar-component-s-scale);
}
.coar-pdtp--l .coar-pdtp-trigger {
  height: var(--coar-component-l-height);
  --coar-component-scale: var(--coar-component-l-scale);
}

/* Input */
.coar-pdtp-input {
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

.coar-pdtp-input::placeholder {
  color: var(--coar-text-placeholder);
}
.coar-pdtp-input:disabled {
  cursor: not-allowed;
  color: var(--coar-text-neutral-disabled);
}
.coar-pdtp-input:read-only {
  cursor: default;
}

.coar-pdtp--xs .coar-pdtp-input {
  font-size: var(--coar-component-xs-font-size);
}
.coar-pdtp--s .coar-pdtp-input {
  font-size: var(--coar-component-s-font-size);
}
.coar-pdtp--l .coar-pdtp-input {
  font-size: var(--coar-component-l-font-size);
}

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
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: 0.4;
}

.coar-pdtp-clear--hidden {
  opacity: 0;
  pointer-events: none;
}
.coar-pdtp-trigger:hover .coar-pdtp-clear:not(.coar-pdtp-clear--hidden) {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}
.coar-pdtp-clear:hover {
  color: var(--coar-icon-neutral-primary);
}

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
  border-radius: 0 var(--coar-input-radius) var(--coar-input-radius) 0;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-pdtp-btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-icon-neutral-primary);
}
.coar-pdtp-btn:disabled {
  cursor: not-allowed;
  color: var(--coar-icon-neutral-disabled);
}

.coar-pdtp--xs .coar-pdtp-btn {
  width: var(--coar-component-xs-height);
}
.coar-pdtp--s .coar-pdtp-btn {
  width: var(--coar-component-s-height);
}
.coar-pdtp--l .coar-pdtp-btn {
  width: var(--coar-component-l-height);
}

/* Message */
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
  .coar-pdtp-trigger,
  .coar-pdtp-clear,
  .coar-pdtp-btn {
    transition: none;
  }
}
</style>
