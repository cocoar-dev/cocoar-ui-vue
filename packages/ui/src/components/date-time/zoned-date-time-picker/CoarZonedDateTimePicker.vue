<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, markRaw } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { Maskito } from '@maskito/core';

import { useI18n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import CoarInputFrame from '../../input-frame/CoarInputFrame.vue';
import CoarInputFrameButton from '../../input-frame/CoarInputFrameButton.vue';
import { getOverlayService } from '../../overlay/useOverlay';
import { datepickerPreset } from '../../overlay/overlay-presets';
import type { OverlayRef } from '../../overlay/overlay-types';
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
import {
  coarGetAllTimezones,
  coarFormatTimezoneLabel,
} from '../_shared/timezone-helpers';
import CoarZonedDateTimePickerPanel from './CoarZonedDateTimePickerPanel.vue';

export type CoarZonedDateTimePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    size?: CoarZonedDateTimePickerSize;
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
    timeZone: null,
    timezoneFilter: () => [],
  },
);

const modelValue = defineModel<Temporal.ZonedDateTime | null>({ default: null });

const emit = defineEmits<{
  opened: [];
  closed: [];
}>();

// i18n
const { t } = useI18n();

// ============================================================
// Composable
// ============================================================
const localeRef = computed(() => props.locale);
const dateFormatRef = computed(() => props.dateFormat);
const pickerBase = useDatePickerBase({ locale: localeRef, dateFormat: dateFormatRef });

// ============================================================
// State
// ============================================================
const activeMonth = ref<Temporal.PlainYearMonth>(
  modelValue.value?.toPlainDateTime().toPlainDate().toPlainYearMonth()
    ?? Temporal.Now.plainDateISO().toPlainYearMonth(),
);
const pendingTime = ref<CoarTimeValue | null>(null);

// Timezone state
const displayTimeZone = ref<string | null>(null);

// IDs
const uid = `coar-zdtp-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const labelId = `${uid}-label`;
const inputId = `${uid}-input`;
const panelId = `${uid}-panel`;
const messageId = `${uid}-message`;

// Refs
// The trigger IS the CoarInputFrame root; reach its DOM node via $el.
const triggerRef = ref<{ $el?: HTMLElement } | null>(null);
const triggerEl = (): HTMLElement | undefined => triggerRef.value?.$el ?? undefined;
const dateInputRef = ref<HTMLInputElement | null>(null);

// Overlay
let overlayRef: OverlayRef | null = null;

// Display value
const displayValue = ref('');

// ============================================================
// Timezone computeds
// ============================================================

/** User's home timezone from the localization service */
const userTimeZone = computed<string>(() =>
  pickerBase.timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
);

/** Value's timezone (where the event "lives") */
const valueTimeZone = computed<string | null>(() =>
  modelValue.value?.timeZoneId ?? null,
);

/** Effective display timezone — explicit → user TZ */
const effectiveDisplayTimeZone = computed<string>(() =>
  displayTimeZone.value ?? userTimeZone.value,
);

/** Default timezone for new values */
const effectiveDefaultTimeZone = computed<string>(() =>
  props.timeZone ?? userTimeZone.value,
);

/** Whether value TZ differs from user TZ */
const locationDiffersFromUser = computed(() =>
  valueTimeZone.value != null && valueTimeZone.value !== userTimeZone.value,
);

/** Whether display TZ differs from value TZ */
const timeZonesDiffer = computed(() =>
  valueTimeZone.value != null && effectiveDisplayTimeZone.value !== valueTimeZone.value,
);

/** Timezone indicator icon state */
const timezoneIndicatorState = computed((): 'home' | 'location' | 'world' => {
  const dtz = effectiveDisplayTimeZone.value;
  const utz = userTimeZone.value;
  const vtz = valueTimeZone.value;
  if (dtz === utz) return 'home';
  if (vtz && dtz === vtz) return 'location';
  return 'world';
});

const timezoneIndicatorClickable = computed(() =>
  locationDiffersFromUser.value || timezoneIndicatorState.value !== 'home',
);

/** Timezone display label for the trigger */
const currentTimeZoneDisplayName = computed(() =>
  coarFormatTimezoneLabel(effectiveDisplayTimeZone.value),
);

/** Timezone display label for the footer (value TZ) */
const valueTimeZoneLabel = computed(() => {
  const vtz = valueTimeZone.value;
  if (!vtz) return '';
  return coarFormatTimezoneLabel(vtz);
});

// ============================================================
// Timezone lists
// ============================================================

const allTimezones = coarGetAllTimezones();

// ============================================================
// Use24Hour / Maskito
// ============================================================

const effectiveUse24Hour = computed(() => {
  if (props.use24Hour === true) return true;
  if (props.use24Hour === false) return false;
  return !coarDetect12HourFormat(pickerBase.effectiveLocale.value);
});

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

// ============================================================
// Format / parse
// ============================================================

/** Format a ZonedDateTime for the input field (in display TZ) */
function formatValue(val: Temporal.ZonedDateTime): string {
  const displayTz = effectiveDisplayTimeZone.value;
  const inDisplayTz = val.withTimeZone(displayTz);
  const datePart = coarFormatPlainDate(
    inDisplayTz.toPlainDate(),
    pickerBase.effectiveDateFormat.value.pattern,
  );
  const timePart = coarFormatTime(inDisplayTz.hour, inDisplayTz.minute, effectiveUse24Hour.value);
  return `${datePart} ${timePart}`;
}

/** Format value in value timezone (for footer display) */
function formatValueInValueTz(): string {
  if (!modelValue.value) return '';
  const datePart = coarFormatPlainDate(
    modelValue.value.toPlainDate(),
    pickerBase.effectiveDateFormat.value.pattern,
  );
  const timePart = coarFormatTime(modelValue.value.hour, modelValue.value.minute, effectiveUse24Hour.value);
  return `${datePart} ${timePart}`;
}

function parseValueFromInput(text: string): Temporal.ZonedDateTime | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const datePart = parts[0];
  const timePart = parts.slice(1).join(' ');
  const date = coarParsePlainDateFromInput(datePart, pickerBase.effectiveDateFormat.value.pattern);
  if (!date) return null;
  const time = coarParseTimeInput(timePart);
  if (!time) return null;
  const pdt = date.toPlainDateTime({ hour: time.hours, minute: time.minutes });
  const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
  try {
    return pdt.toZonedDateTime(tz);
  } catch {
    return null;
  }
}

// Sync display value
watch(
  [modelValue, effectiveDisplayTimeZone],
  () => {
    displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
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

// ============================================================
// Computed helpers
// ============================================================

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

// Extracted date/time from model (in working timezone for the panel)
const workingTimeZone = computed(() => effectiveDisplayTimeZone.value);

const valueInWorkingTz = computed(() => {
  if (!modelValue.value) return null;
  return modelValue.value.withTimeZone(workingTimeZone.value);
});

const selectedDate = computed((): Temporal.PlainDate | null =>
  valueInWorkingTz.value ? valueInWorkingTz.value.toPlainDate() : null,
);
const selectedTime = computed((): CoarTimeValue | null => {
  if (valueInWorkingTz.value) {
    return { hours: valueInWorkingTz.value.hour, minutes: valueInWorkingTz.value.minute };
  }
  return pendingTime.value;
});

// Min/max as PlainDate (for calendar constraints)
const minDate = computed((): Temporal.PlainDate | null =>
  props.min ? props.min.toPlainDate() : null,
);
const maxDate = computed((): Temporal.PlainDate | null =>
  props.max ? props.max.toPlainDate() : null,
);

// Effective time constraints (only on boundary dates)
const effectiveMinTime = computed((): CoarTimeValue | null => {
  if (!props.min || !selectedDate.value) return null;
  const minInWtz = props.min.withTimeZone(workingTimeZone.value);
  if (Temporal.PlainDate.compare(selectedDate.value, minInWtz.toPlainDate()) === 0) {
    return { hours: minInWtz.hour, minutes: minInWtz.minute };
  }
  return null;
});
const effectiveMaxTime = computed((): CoarTimeValue | null => {
  if (!props.max || !selectedDate.value) return null;
  const maxInWtz = props.max.withTimeZone(workingTimeZone.value);
  if (Temporal.PlainDate.compare(selectedDate.value, maxInWtz.toPlainDate()) === 0) {
    return { hours: maxInWtz.hour, minutes: maxInWtz.minute };
  }
  return null;
});

// Year boundary helpers
const isPrevYearDisabled = computed(() => activeMonth.value.year <= Temporal.Now.plainDateISO().year - 100);
const isNextYearDisabled = computed(() => activeMonth.value.year >= Temporal.Now.plainDateISO().year + 50);
const today = computed(() => Temporal.Now.plainDateISO());

// ============================================================
// Clamping
// ============================================================

function clampZonedDateTime(zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  if (props.min && Temporal.Instant.compare(zdt.toInstant(), props.min.toInstant()) < 0) {
    return props.min;
  }
  if (props.max && Temporal.Instant.compare(zdt.toInstant(), props.max.toInstant()) > 0) {
    return props.max;
  }
  return zdt;
}

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
    onDateSelected: (date: Temporal.PlainDate) => {
      const time = selectedTime.value ?? props.defaultTime;
      const pdt = date.toPlainDateTime({
        hour: time.hours,
        minute: coarRoundMinutesToStep(time.minutes, props.minuteStep),
      });
      const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
      let zdt: Temporal.ZonedDateTime;
      if (workingTimeZone.value !== tz) {
        const inDisplayTz = pdt.toZonedDateTime(workingTimeZone.value);
        zdt = inDisplayTz.withTimeZone(tz);
      } else {
        zdt = pdt.toZonedDateTime(tz);
      }
      zdt = clampZonedDateTime(zdt);
      modelValue.value = zdt;
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
        const pdt = selectedDate.value.toPlainDateTime({ hour: time.hours, minute: time.minutes });
        const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
        let zdt: Temporal.ZonedDateTime;
        if (workingTimeZone.value !== tz) {
          const inDisplayTz = pdt.toZonedDateTime(workingTimeZone.value);
          zdt = inDisplayTz.withTimeZone(tz);
        } else {
          zdt = pdt.toZonedDateTime(tz);
        }
        zdt = clampZonedDateTime(zdt);
        modelValue.value = zdt;
      } else {
        pendingTime.value = time;
      }
    },
    onSelectDisplayTimezone: (tzId: string) => {
      displayTimeZone.value = tzId;
    },
    onChangeValueTimezone: (newTzId: string) => {
      if (modelValue.value) {
        const pdt = modelValue.value.toPlainDateTime();
        modelValue.value = pdt.toZonedDateTime(newTzId);
      }
    },
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
  if ((event.key === 'Enter' || event.key === 'ArrowDown') && !pickerBase.isOpen.value) {
    event.preventDefault(); openPanel();
  }
}

// ============================================================
// Actions
// ============================================================

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
    const inWtz = parsed.withTimeZone(workingTimeZone.value);
    activeMonth.value = inWtz.toPlainDate().toPlainYearMonth();
  }
}

function onInputBlur() {
  const text = displayValue.value;
  const parsed = parseValueFromInput(text);
  if (!parsed && text.length > 0) {
    displayValue.value = modelValue.value ? formatValue(modelValue.value) : '';
  }
}

// ============================================================
// Timezone actions (trigger)
// ============================================================

/** Toggle display TZ between home ↔ location */
function toggleDisplayTimezone() {
  if (!timezoneIndicatorClickable.value) return;
  const state = timezoneIndicatorState.value;
  if (state === 'home' && valueTimeZone.value && valueTimeZone.value !== userTimeZone.value) {
    displayTimeZone.value = valueTimeZone.value;
  } else {
    displayTimeZone.value = userTimeZone.value;
  }
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
    :class="[`coar-zdtp--${size}`]"
  >
    <!-- Label -->
    <label
      v-if="label"
      :id="labelId"
      class="coar-zdtp-label"
      :for="inputId"
    >
      {{ label }}
      <span v-if="required" class="coar-zdtp-required" aria-hidden="true">*</span>
    </label>

    <!-- Trigger = the shared input shell. combobox role/aria fall through to its
         root; focus lives on the inner input (frame styles via :focus-within). -->
    <CoarInputFrame
      ref="triggerRef"
      role="combobox"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      :aria-labelledby="label ? labelId : undefined"
      :aria-invalid="hasError || undefined"
      class="coar-zdtp-trigger"
      :size="size"
      :error="hasError"
      :disabled="isDisabled"
      :readonly="readonly"
      :active="pickerBase.isOpen.value"
      @keydown="onKeydown"
    >
      <!-- Clear button → leading affix -->
      <template #leading>
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
        :disabled="isDisabled"
        :readonly="readonly"
        :aria-describedby="displayMessage ? messageId : undefined"
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

      <!-- Calendar trigger → Type-B edge button (#actions). The TZ label floats on
           the bottom border just left of the button (anchored via right:100%, so it
           tracks the button width at any radius / field padding). -->
      <template #actions>
        <span class="coar-zdtp-actions">
          <span
            v-if="modelValue"
            class="coar-zdtp-tz-inline"
            :title="currentTimeZoneDisplayName"
          >
            {{ currentTimeZoneDisplayName }}
          </span>
          <CoarInputFrameButton
            class="coar-zdtp-btn"
            :disabled="isDisabled"
            :aria-label="t('coar.ui.zonedDateTimePicker.openPicker', undefined, 'Open date and time picker')"
            @click.stop="togglePanel"
          >
            <CoarIcon name="calendar" size="s" />
          </CoarInputFrameButton>
        </span>
      </template>
    </CoarInputFrame>

    <!-- Messages -->
    <div
      v-if="displayMessage"
      :id="messageId"
      class="coar-form-field-message"
      :class="{ 'coar-form-field-message--error': hasError }"
      aria-live="polite"
    >
      {{ displayMessage }}
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   COAR ZONED DATE-TIME PICKER
   ======================================== */

.coar-zdtp {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  width: 100%;
}

/* ========================================
   LABEL
   ======================================== */

.coar-zdtp-label {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
}

.coar-zdtp-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: 2px;
}

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
  background: none;
  border: none;
  padding: 0;
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: 0.4;
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
  font-size: var(--coar-body-small-base-size);
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

/* #actions wrapper: positioning context for the floating TZ label so it can sit
   exactly at the calendar button's left edge regardless of the button width. */
.coar-zdtp-actions {
  position: relative;
  display: flex;
  align-self: stretch;
}

.coar-zdtp-tz-inline {
  position: absolute;
  bottom: 0;
  /* right:100% anchors the label's right edge to the calendar button's left edge,
     so it tracks the (now token-driven) button width — no hardcoded offset. */
  right: 100%;
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

.coar-zdtp--xs .coar-zdtp-input { font-size: var(--coar-component-xs-font-size); }
.coar-zdtp--s .coar-zdtp-input { font-size: var(--coar-component-s-font-size); }
.coar-zdtp--l .coar-zdtp-input { font-size: var(--coar-component-l-font-size); }

/* ========================================
   FORM FIELD MESSAGE
   ======================================== */

.coar-form-field-message {
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.coar-form-field-message--error { color: var(--coar-text-semantic-error-bold); }
</style>
