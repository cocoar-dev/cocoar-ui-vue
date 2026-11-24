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
import { useZonedDateTimePicker } from '../_shared/use-zoned-date-time-picker';
import { coarCreateDateTimeMask } from '../_shared/maskito-config';
import type { DateFormatConfig, CoarDateMarker, CoarTimeValue } from '../_shared/types';
import CoarZonedDateTimePickerPanel from './CoarZonedDateTimePickerPanel.vue';
import { FORM_FIELD_INJECTION_KEY } from '../../form-field/constants';

export type CoarZonedDateTimePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    size?: CoarZonedDateTimePickerSize;
    /** `inline`: no border or surface until hovered or edited (Preview) */
    appearance?: CoarInputAppearance;
    /** `content`: as wide as the shown value and its zone caption (Preview) */
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
    min?: Temporal.ZonedDateTime | null;
    /** Maximum selectable datetime */
    max?: Temporal.ZonedDateTime | null;
    /** 24h / 12h / auto */
    use24Hour?: boolean | 'auto';
    /** Minute step */
    minuteStep?: 1 | 5 | 10 | 15;
    /** Default time when selecting a date without existing time */
    defaultTime?: CoarTimeValue;
    showTodayMonthButton?: boolean;
    /** Default timezone for new values (IANA ID) */
    timeZone?: string | null;
    /** Wildcard filter patterns for timezone list (e.g. ['Europe/*']) */
    timezoneFilter?: string[];
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
    timeZone: null,
    timezoneFilter: () => [],
  },
);

const modelValue = defineModel<Temporal.ZonedDateTime | null>({ default: null });

const emit = defineEmits<{
  opened: [];
  closed: [];
  /** `true` when the field is left with text that is no value: it stays as an error and the model keeps its value; `false` once that ends. */
  'entry-refused': [refused: boolean];
}>();

// i18n
const { t } = useI18n();

// ============================================================
// Composable
// ============================================================
const picker = useZonedDateTimePicker(modelValue, props);
const {
  pickerBase, activeMonth, displayValue, valueTimeZone, effectiveDisplayTimeZone,
  timeZonesDiffer, timezoneIndicatorState, timezoneIndicatorClickable,
  currentTimeZoneDisplayName, valueTimeZoneLabel, allTimezones, effectiveUse24Hour,
  inputPlaceholder, valueInWorkingTz, selectedDate, selectedTime,
  minDate, maxDate, effectiveMinTime, effectiveMaxTime, formatValueInValueTz,
  toggleDisplayTimezone,
} = picker;

// Form-field integration: label + status icon + message live on the wrapping
// CoarFormField. We only consume its id / error / describedby contract.
const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

// IDs
const uid = `coar-zdtp-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || `${uid}-input`);
const panelId = `${uid}-panel`;

// Refs
// The trigger IS the CoarInputFrame root; reach its DOM node via $el.
const triggerRef = ref<{ $el?: HTMLElement } | null>(null);
const triggerEl = (): HTMLElement | undefined => triggerRef.value?.$el ?? undefined;
const dateInputRef = ref<HTMLInputElement | null>(null);

// Overlay
let overlayRef: OverlayRef | null = null;

// ============================================================
// Maskito
// ============================================================

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

// ============================================================
// Computed helpers
// ============================================================

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
// ============================================================
// Open / close
// ============================================================

function openPanel() {
  if (isDisabled.value || props.readonly || pickerBase.isOpen.value) return;
  if (valueInWorkingTz.value) {
    activeMonth.value = valueInWorkingTz.value.toPlainDate().toPlainYearMonth();
  }

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
    use24Hour: effectiveUse24Hour.value,
    minuteStep: props.minuteStep,
    effectiveMinTime: effectiveMinTime.value,
    effectiveMaxTime: effectiveMaxTime.value,
    effectiveDisplayTimeZone: effectiveDisplayTimeZone.value,
    valueTimeZone: valueTimeZone.value,
    allTimezones,
    timezoneFilter: props.timezoneFilter,
    valueTimeZoneLabel: valueTimeZoneLabel.value,
    timeZonesDiffer: timeZonesDiffer.value,
    hasValue: modelValue.value != null,
    formatValueInValueTz: formatValueInValueTz(),
    onDateSelected: picker.selectDate,
    onActiveMonthChanged: picker.selectMonth,
    onSelectMonth: picker.selectMonth,
    onPreviousYear: picker.previousYear,
    onNextYear: picker.nextYear,
    onScrollToTodayMonth: picker.scrollToTodayMonth,
    onTimeChanged: picker.changeTime,
    onSelectDisplayTimezone: picker.selectDisplayTimezone,
    onChangeValueTimezone: picker.changeValueTimezone,
  });

  // Sync parent state → panel inputs
  const stopWatchers: Array<() => void> = [];
  stopWatchers.push(watch(selectedDate, (v) => { panelInputs.modelValue = v; }));
  stopWatchers.push(watch(activeMonth, (v) => { panelInputs.activeMonth = v; }));
  stopWatchers.push(watch(minDate, (v) => { panelInputs.min = v; }));
  stopWatchers.push(watch(maxDate, (v) => { panelInputs.max = v; }));
  stopWatchers.push(watch(() => pickerBase.effectiveLocale.value, (v) => { panelInputs.locale = v; }));
  stopWatchers.push(watch(() => pickerBase.effectiveDateFormat.value, (v) => { panelInputs.dateFormatConfig = v; }));
  stopWatchers.push(watch(() => props.showWeekNumbers, (v) => { panelInputs.showWeekNumbers = v; }));
  stopWatchers.push(watch(() => props.highlightWeekends, (v) => { panelInputs.highlightWeekends = v; }));
  stopWatchers.push(watch(() => props.markers, (v) => { panelInputs.markers = v; }));
  stopWatchers.push(watch(() => props.showTodayMonthButton, (v) => { panelInputs.showTodayMonthButton = v; }));
  stopWatchers.push(watch(selectedTime, (v) => { panelInputs.selectedTime = v; }));
  stopWatchers.push(watch(effectiveUse24Hour, (v) => { panelInputs.use24Hour = v; }));
  stopWatchers.push(watch(() => props.minuteStep, (v) => { panelInputs.minuteStep = v; }));
  stopWatchers.push(watch(effectiveMinTime, (v) => { panelInputs.effectiveMinTime = v; }));
  stopWatchers.push(watch(effectiveMaxTime, (v) => { panelInputs.effectiveMaxTime = v; }));
  stopWatchers.push(watch(effectiveDisplayTimeZone, (v) => { panelInputs.effectiveDisplayTimeZone = v; }));
  stopWatchers.push(watch(valueTimeZone, (v) => { panelInputs.valueTimeZone = v; }));
  stopWatchers.push(watch(() => props.timezoneFilter, (v) => { panelInputs.timezoneFilter = v; }));
  stopWatchers.push(watch(valueTimeZoneLabel, (v) => { panelInputs.valueTimeZoneLabel = v; }));
  stopWatchers.push(watch(timeZonesDiffer, (v) => { panelInputs.timeZonesDiffer = v; }));
  stopWatchers.push(watch(modelValue, (v) => {
    panelInputs.hasValue = v != null;
    panelInputs.formatValueInValueTz = formatValueInValueTz();
  }));

  overlayRef = getOverlayService().open({
    spec: {
      ...datepickerPreset,
      anchor: { kind: 'element', element: trigger },
      a11y: { role: 'dialog', label: t('coar.ui.zonedDateTimePicker.dialog', undefined, 'Date, time and timezone picker') },
    },
    content: { kind: 'component', component: markRaw(CoarZonedDateTimePickerPanel) },
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
    event.preventDefault(); openPanel();
  }
}

// ============================================================
// Actions
// ============================================================

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

// Timezone indicator icon name
const tzIndicatorIcon = computed(() => {
  switch (timezoneIndicatorState.value) {
    case 'home': return 'home';
    case 'location': return 'map-pin';
    case 'world': return 'globe';
    default: return 'globe';
  }
});
</script>

<template>
  <div
    class="coar-zdtp"
    :class="[
      `coar-zdtp--${size}`,
      { 'coar-zdtp--inline': appearance === 'inline', 'coar-zdtp--content': width === 'content' },
    ]"
  >
    <!-- Trigger = the shared input shell. combobox role/aria fall through to its
         root; focus lives on the inner input (frame styles via :focus-within). -->
    <CoarInputFrame
      ref="triggerRef"
      role="combobox"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      :aria-invalid="hasError || undefined"
      class="coar-zdtp-trigger"
      mobile-sizing
      :size="size"
      :error="hasError"
      :appearance="appearance"
      :disabled="isDisabled"
      :readonly="readonly"
      :active="pickerBase.isOpen.value"
      @keydown="onKeydown"
    >
      <!-- Clear button → leading affix (only when clearable) -->
      <template v-if="clearSlotActive" #leading>
        <button
          type="button"
          class="coar-zdtp-clear"
          :class="{ 'coar-zdtp-clear--hidden': !showClearButton }"
          :aria-label="t('coar.ui.zonedDateTimePicker.clearValue', undefined, 'Clear value')"
          tabindex="-1"
          :disabled="isDisabled"
          @click="clearValue"
        >
          <CoarIcon name="x" size="auto" />
        </button>
      </template>

      <!-- Input -->
      <input
        :id="inputId"
        ref="dateInputRef"
        class="coar-zdtp-input"
        type="text"
        :placeholder="inputPlaceholder"
        :value="displayValue"
        :size="width === 'content' ? Math.max(1, (displayValue || inputPlaceholder).length) : undefined"
        :disabled="isDisabled"
        :readonly="readonly"
        :required="required"
        :aria-describedby="describedBy"
        autocomplete="off"
        @input="onInputChange"
        @blur="onInputBlur"
      />

      <!-- Timezone indicator icon → trailing affix (Type A) -->
      <template #trailing>
        <button
          type="button"
          class="coar-zdtp-tz-indicator"
          :class="{
            'coar-zdtp-tz-indicator--clickable': timezoneIndicatorClickable,
            'coar-zdtp-tz-indicator--disabled': !timezoneIndicatorClickable,
          }"
          :aria-label="t('coar.ui.zonedDateTimePicker.timezoneIndicator', { tz: currentTimeZoneDisplayName }, `Timezone: ${currentTimeZoneDisplayName}`) + (timezoneIndicatorClickable ? '. ' + t('coar.ui.zonedDateTimePicker.clickToToggle', undefined, 'Click to toggle.') : '')"
          tabindex="-1"
          :disabled="isDisabled"
          @click.stop="toggleDisplayTimezone"
        >
          <CoarIcon :name="tzIndicatorIcon" size="xs" />
        </button>
      </template>

      <!-- Calendar trigger → Type-B edge button (#actions). -->
      <template #actions>
        <CoarInputFrameButton
          class="coar-zdtp-btn"
          :plain="appearance === 'inline'"
          :disabled="isDisabled"
          :aria-label="t('coar.ui.zonedDateTimePicker.openPicker', undefined, 'Open date and time picker')"
          @click.stop="togglePanel"
        >
          <CoarIcon name="calendar" size="s" />
        </CoarInputFrameButton>
      </template>
    </CoarInputFrame>

    <!-- TZ caption floats on the bottom border, just left of the calendar button.
         It lives OUTSIDE the frame: the frame's overflow:hidden (which clips the
         edge-button corners to the radius) would otherwise cut the half that
         straddles below the border. Anchored from the wrapper's right edge by the
         calendar button's token-derived width so it tracks radius + field padding. -->
    <span
      v-if="modelValue"
      class="coar-zdtp-tz-inline"
      :title="currentTimeZoneDisplayName"
    >
      {{ currentTimeZoneDisplayName }}
    </span>
    <!-- Content width: the caption floats, so it adds nothing to the intrinsic width.
         This zero-height copy, ending where the caption ends, makes the box at least
         as wide as the caption and its distance from the right edge. -->
    <span
      v-if="modelValue && width === 'content'"
      class="coar-zdtp-tz-inline coar-zdtp-tz-sizer"
      aria-hidden="true"
    >
      {{ currentTimeZoneDisplayName }}
    </span>
  </div>
</template>

<style scoped>
/* ========================================
   COAR ZONED DATE-TIME PICKER
   ======================================== */

.coar-zdtp {
  /* positioning context for the floating TZ caption, which sits OUTSIDE the frame
     (see .coar-zdtp-tz-inline). Per-size helpers re-derive the calendar button's
     metrics so the caption can anchor to its left edge without inheriting the
     frame's private vars. */
  --coar-zdtp-scale: 1;
  --coar-zdtp-height: var(--coar-component-m-height);
  /* Distance of the caption's right edge from the wrapper's: see .coar-zdtp-tz-inline. */
  --coar-zdtp-caption-end: max(var(--coar-zone-caption-min-offset, 0px), calc(
    var(--coar-spacing-s) * var(--coar-zdtp-scale)
    + 16px
    + max(
      calc(var(--coar-field-padding-x) * var(--coar-zdtp-scale) * var(--coar-component-density, 1)),
      min(var(--coar-input-radius), calc(var(--coar-zdtp-height) / 2))
    )
    + 2px
  ));
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  width: 100%;
}

/* Content width: as wide as the value with its affixes, or as the zone caption with
   its distance from the right edge, whichever is wider; at most the line. */
.coar-zdtp--content {
  display: inline-flex;
  inline-size: max-content;
  max-inline-size: 100%;
}
.coar-zdtp--content .coar-zdtp-input {
  field-sizing: content;
  min-inline-size: 2ch;
}
/* Two classes: the caption's own rule comes later and would place it back. */
.coar-zdtp-tz-inline.coar-zdtp-tz-sizer {
  position: static;
  transform: none;
  height: 0;
  margin-top: calc(-1 * var(--coar-spacing-xs));
  margin-right: var(--coar-zdtp-caption-end);
  overflow: hidden;
  visibility: hidden;
}

/* Inline: no border for the caption to cover, so it has no surface of its own and
   lies on the fill of hover and focus. */
.coar-zdtp--inline .coar-zdtp-tz-inline {
  background-color: transparent;
}

/* Label + status icon + message are owned by the wrapping CoarFormField. */

/* ========================================
   TRIGGER
   ======================================== */

/* Box / radius / size / states are owned by CoarInputFrame; only the pointer
   affordance lives here (clear / tz-indicator / calendar come via slots). */
.coar-zdtp-trigger:not(.coar-input-frame--disabled):not(.coar-input-frame--readonly) {
  cursor: pointer;
}

/* ========================================
   CLEAR BUTTON
   ======================================== */

.coar-zdtp-clear {
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

.coar-zdtp-clear--hidden {
  opacity: 0;
  pointer-events: none;
}

.coar-zdtp-trigger:hover .coar-zdtp-clear:not(.coar-zdtp-clear--hidden) {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-zdtp-clear:hover {
  color: var(--coar-icon-neutral-primary);
}

/* ========================================
   INPUT
   ======================================== */

.coar-zdtp-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  padding: 0;
  font-family: var(--coar-body-small-base-family);
  font-size: max(var(--coar-field-font-size, var(--coar-body-small-base-size)), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  text-align: right;
}

.coar-zdtp-input::placeholder {
  color: var(--coar-text-placeholder);
}

/* ========================================
   TIMEZONE INLINE LABEL (on trigger border)
   ======================================== */

.coar-zdtp-tz-inline {
  position: absolute;
  bottom: 0;
  /* Anchor the caption's right edge to the calendar button's left edge. The button
     lives in the frame (overflow:hidden), so the caption can't anchor off it via
     right:100% anymore — re-derive its outer width from the same tokens the button
     uses (CoarInputFrameButton: spacing-s×scale left pad + icon + max(field-pad,
     corner) right pad + 1px separator) plus the frame's 1px right border. Tracks
     radius + field padding without inheriting the frame's private vars. */
  right: var(--coar-zdtp-caption-end);
  transform: translateY(50%);
  padding: 0 var(--coar-spacing-xs);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-footnote-size);
  color: var(--coar-text-neutral-tertiary);
  background-color: var(--coar-surface-input);
  white-space: nowrap;
  pointer-events: none;
  border-radius: var(--coar-radius-xs);
  line-height: 1.2;
  letter-spacing: 0.02em;
}

/* ========================================
   TIMEZONE INDICATOR ICON
   ======================================== */

.coar-zdtp-tz-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  /* Mobile (.coar-mobile): a 44px target around the unchanged icon; `auto` outside. */
  min-width: var(--coar-control-min-target-size, auto);
  min-height: var(--coar-control-min-target-size, auto);
  height: 100%;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition: color var(--coar-duration-fast) var(--coar-ease-out), opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-zdtp-tz-indicator--clickable:hover {
  color: var(--coar-icon-accent-primary);
}

.coar-zdtp-tz-indicator--disabled {
  opacity: 0.4;
  cursor: default;
}

/* The calendar segment button is a CoarInputFrameButton (Type-B edge button);
   its surface / separator / icon inset / corner clipping are owned there. */

/* ========================================
   SIZE VARIANTS (font only — box height/scale come from the frame's size prop)
   ======================================== */

.coar-zdtp--xs .coar-zdtp-input { font-size: max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size, var(--coar-field-font-size, var(--coar-component-xs-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-zdtp--s .coar-zdtp-input { font-size: max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size, var(--coar-field-font-size, var(--coar-component-s-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }
.coar-zdtp--l .coar-zdtp-input { font-size: max(var(--coar-field-l-font-size, var(--coar-field-l-default-font-size, var(--coar-field-font-size, var(--coar-component-l-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px)); }

/* Per-size calendar-button metrics for the TZ-caption anchor (mirrors the frame). */
.coar-zdtp--xs { --coar-zdtp-scale: var(--coar-component-xs-scale); --coar-zdtp-height: var(--coar-component-xs-height); }
.coar-zdtp--s { --coar-zdtp-scale: var(--coar-component-s-scale); --coar-zdtp-height: var(--coar-component-s-height); }
.coar-zdtp--l { --coar-zdtp-scale: var(--coar-component-l-scale); --coar-zdtp-height: var(--coar-component-l-height); }

/* Mobile (.coar-mobile): the frame takes the mobile height, paints its border inside
   (no 1px frame border on the right) and the calendar button is at least a 44px
   target. Re-anchor the caption to that button. */
.coar-mobile .coar-zdtp { --coar-zdtp-height: max(var(--coar-component-m-height), var(--coar-control-m-height, 0px)); }
.coar-mobile .coar-zdtp--xs { --coar-zdtp-height: max(var(--coar-component-xs-height), var(--coar-control-xs-height, 0px)); }
.coar-mobile .coar-zdtp--s { --coar-zdtp-height: max(var(--coar-component-s-height), var(--coar-control-s-height, 0px)); }
.coar-mobile .coar-zdtp--l { --coar-zdtp-height: max(var(--coar-component-l-height), var(--coar-control-l-height, 0px)); }
.coar-mobile .coar-zdtp {
  --coar-zdtp-caption-end: max(
    calc(
      var(--coar-spacing-s) * var(--coar-zdtp-scale)
      + 16px
      + max(
        calc(var(--coar-field-padding-x) * var(--coar-zdtp-scale) * var(--coar-component-density, 1)),
        min(var(--coar-input-radius), calc(var(--coar-zdtp-height) / 2))
      )
      + 1px
    ),
    var(--coar-control-min-target-size, 0px)
  );
}
</style>
