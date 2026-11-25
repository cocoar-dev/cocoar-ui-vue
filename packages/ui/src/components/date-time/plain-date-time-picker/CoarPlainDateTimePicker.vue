<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, markRaw } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { Maskito } from '@maskito/core';

import { useI18n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarInputFrame from '../../input-frame/CoarInputFrame.vue';
import type { CoarInputAppearance, CoarInputWidth } from '../../input-frame/types';
import CoarInputFrameButton from '../../input-frame/CoarInputFrameButton.vue';
import { getOverlayService } from '../../overlay/useOverlay';
import { datepickerPreset } from '../../overlay/overlay-presets';
import type { OverlayRef } from '../../overlay/overlay-types';
import { usePlainDateTimePicker } from '../_shared/use-plain-date-time-picker';
import { coarCreateDateTimeMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker, CoarTimePrecision, CoarTimeValue } from '../_shared/types';
import CoarPlainDateTimePickerPanel from './CoarPlainDateTimePickerPanel.vue';
import { FORM_FIELD_INJECTION_KEY } from '../../form-field/constants';

export type CoarPlainDateTimePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    size?: CoarPlainDateTimePickerSize;
    /** `inline`: no border or surface until hovered or edited (Preview) */
    appearance?: CoarInputAppearance;
    /** `content`: as wide as the shown value or placeholder (Preview) */
    width?: CoarInputWidth;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    /**
     * Error state (boolean for standalone use; auto-injected from CoarFormField).
     * Message + status icon live on the wrapping CoarFormField.
     */
    error?: boolean;
    /** Explicit input id (else taken from CoarFormField, else auto). */
    id?: string;
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
    /**
     * How exactly the field shows and takes the time: `'second'` and `'millisecond'`
     * add them to the field. A value keeps what the field does not show (Preview).
     */
    precision?: CoarTimePrecision;
    showTodayMonthButton?: boolean;
  }>(),
  {
    placeholder: '',
    size: 'm',
    appearance: 'outline',
    width: 'fill',
    disabled: false,
    readonly: false,
    required: false,
    error: false,
    id: '',
    clearable: false,
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
    precision: 'minute',
  },
);

const modelValue = defineModel<Temporal.PlainDateTime | null>({ default: null });

const emit = defineEmits<{
  opened: [];
  closed: [];
  /** `true` when the field is left with text that is no value: it stays as an error and the model keeps its value; `false` once that ends. */
  'entry-refused': [refused: boolean];
}>();

// i18n
const { t } = useI18n();

// Value logic: state, formatting/parsing, min/max, navigation (shared with other presentations)
const picker = usePlainDateTimePicker(modelValue, props);
const {
  pickerBase, activeMonth, displayValue, effectiveUse24Hour, inputPlaceholder,
  selectedDate, selectedTime, minDate, maxDate, effectiveMinTime, effectiveMaxTime,
} = picker;

// Form-field integration: label + status icon + message live on the wrapping
// CoarFormField. We only consume its id / error / describedby contract.
const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

// IDs
const uid = `coar-plain-dt-picker-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || `${uid}-input`);
const panelId = `${uid}-panel`;

// Refs — the trigger IS the CoarInputFrame root; reach its DOM node via $el.
const triggerRef = ref<{ $el?: HTMLElement } | null>(null);
const triggerEl = (): HTMLElement | undefined => triggerRef.value?.$el ?? undefined;
const dateInputRef = ref<HTMLInputElement | null>(null);

// Overlay
let overlayRef: OverlayRef | null = null;

// Maskito
let maskitoInstance: Maskito | undefined;

function initMaskito() {
  maskitoInstance?.destroy();
  if (!dateInputRef.value) return;
  const mask = coarCreateDateTimeMask(
    pickerBase.effectiveDateFormat.value.pattern,
    !effectiveUse24Hour.value,
    props.precision,
    picker.refuseInput,
  );
  maskitoInstance = new Maskito(dateInputRef.value, mask);
}

watch([dateInputRef, () => pickerBase.effectiveDateFormat.value, () => props.precision], () => {
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
const hasError = computed(() => props.error || picker.refused.value || (formField?.hasError.value ?? false));
watch(picker.refused, (refused) => emit('entry-refused', refused));
const describedBy = computed(() => formField?.messageId.value || undefined);
const isDisabled = computed(() => props.disabled);
const showClearButton = computed(
  () => props.clearable && modelValue.value !== null && !isDisabled.value && !props.readonly,
);
// Reserve the leading slot for the clear button only when clearable (hidden-not-
// removed while empty so the field doesn't resize); not clearable → no left gap.
const clearSlotActive = computed(
  () => props.clearable && !isDisabled.value && !props.readonly,
);

// Open/close
function openPanel() {
  if (isDisabled.value || props.readonly || pickerBase.isOpen.value) return;
  if (modelValue.value) activeMonth.value = modelValue.value.toPlainDate().toPlainYearMonth();

  const trigger = triggerEl();
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
    onDateSelected: picker.selectDate,
    onActiveMonthChanged: picker.selectMonth,
    onSelectMonth: picker.selectMonth,
    onPreviousYear: picker.previousYear,
    onNextYear: picker.nextYear,
    onScrollToTodayMonth: picker.scrollToTodayMonth,
    onTimeChanged: picker.changeTime,
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
  if (event.key === 'Escape' && !pickerBase.isOpen.value
    && picker.displayValue.value !== (modelValue.value ? picker.formatValue(modelValue.value) : '')) {
    event.preventDefault();
    picker.restoreInput();
    return;
  }
  if ((event.key === 'Enter' || event.key === 'ArrowDown') && !pickerBase.isOpen.value) {
    event.preventDefault();
    openPanel();
  }
}

// Actions
function clearValue(event: Event) {
  event.stopPropagation();
  picker.clearValue();
}

function onInputChange(event: Event) {
  picker.changeInput((event.target as HTMLInputElement).value);
}

function onInputBlur() {
  picker.blurInput();
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
        'coar-pdtp--content': width === 'content',
      },
    ]"
  >
    <!-- Trigger = the shared input shell. combobox role/aria fall through to its
         root; focus lives on the inner input (frame styles via :focus-within). -->
    <CoarInputFrame
      ref="triggerRef"
      class="coar-pdtp-trigger"
      mobile-sizing
      :size="size"
      :error="hasError"
      :appearance="appearance"
      :disabled="isDisabled"
      :readonly="readonly"
      :active="pickerBase.isOpen.value"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      role="combobox"
    >
      <!-- Clear → leading affix (only when clearable) -->
      <template v-if="clearSlotActive" #leading>
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
      </template>

      <input
        :id="inputId"
        ref="dateInputRef"
        type="text"
        class="coar-pdtp-input"
        :value="displayValue"
        :placeholder="inputPlaceholder"
        :size="width === 'content' ? Math.max(1, (displayValue || inputPlaceholder).length) : undefined"
        :disabled="isDisabled"
        :readonly="readonly"
        :required="required"
        :aria-invalid="hasError"
        :aria-describedby="describedBy"
        autocomplete="off"
        @input="onInputChange"
        @blur="onInputBlur"
        @keydown="onKeydown"
      />

      <!-- Calendar trigger → Type-B edge button (#actions) -->
      <template #actions>
        <CoarInputFrameButton
          class="coar-pdtp-btn"
          :plain="appearance === 'inline'"
          :aria-label="t('coar.ui.dateTimePicker.openPicker', undefined, 'Open picker')"
          :disabled="isDisabled || readonly"
          @click="togglePanel"
        >
          <CoarIcon name="calendar" size="s" />
        </CoarInputFrameButton>
      </template>
    </CoarInputFrame>
  </div>
</template>

<style scoped>
.coar-pdtp-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Content width: the field is as wide as the shown value or placeholder (the
   `size` attribute is the fallback without field-sizing), the box at most the line. */
.coar-pdtp--content {
  display: inline-flex;
  inline-size: max-content;
  max-inline-size: 100%;
}
.coar-pdtp--content .coar-pdtp-input {
  field-sizing: content;
  min-inline-size: 2ch;
}

/* Label + status icon + message are owned by the wrapping CoarFormField. */

/* Box / radius / size / states are owned by CoarInputFrame; only the pointer
   affordance lives here (calendar segment + clear come via slots). */
.coar-pdtp-trigger:not(.coar-input-frame--disabled):not(.coar-input-frame--readonly) {
  cursor: pointer;
}

/* Input */
.coar-pdtp-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: max(var(--coar-field-font-size, var(--coar-body-small-base-size)), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
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
  font-size: max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size, var(--coar-field-font-size, var(--coar-component-xs-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
}
.coar-pdtp--s .coar-pdtp-input {
  font-size: max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size, var(--coar-field-font-size, var(--coar-component-s-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
}
.coar-pdtp--l .coar-pdtp-input {
  font-size: max(var(--coar-field-l-font-size, var(--coar-field-l-default-font-size, var(--coar-field-font-size, var(--coar-component-l-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
}

/* Clear */
.coar-pdtp-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: var(--coar-control-min-target-size, auto);
  min-height: var(--coar-control-min-target-size, auto);
  background: none;
  border: none;
  padding: 0;
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: var(--coar-control-clear-opacity, 0.4);
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

/* The calendar segment button is a CoarInputFrameButton (Type-B edge button);
   its surface / separator / icon inset / corner clipping are owned there. */

@media (prefers-reduced-motion: reduce) {
  .coar-pdtp-trigger,
  .coar-pdtp-clear,
  .coar-pdtp-btn {
    transition: none;
  }
}
</style>
