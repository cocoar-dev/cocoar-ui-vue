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
import { vScrollbar } from '../../scrollbar';
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
  coarFilterTimezones,
  coarGroupTimezones,
  coarFormatTimezoneLabel,
  type TimezoneGroup,
} from '../_shared/timezone-helpers';

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
const isSelectingDisplayTimezone = ref(false);
const isEditingValueTimezone = ref(false);
const timezoneSearchQuery = ref('');
const tzSearchInputRef = ref<HTMLInputElement | null>(null);

// IDs
const uid = `coar-zdtp-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
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

/** Filtered timezone IDs based on timezoneFilter prop */
const filteredTimezones = computed(() =>
  coarFilterTimezones(allTimezones, props.timezoneFilter),
);

/** Grouped timezones for the display timezone picker */
const groupedTimezoneList = computed((): TimezoneGroup[] =>
  coarGroupTimezones(filteredTimezones.value, timezoneSearchQuery.value),
);

/** Flat timezone options for the value timezone select (footer) */
const timezoneOptions = computed(() =>
  filteredTimezones.value.map((tz) => ({
    id: tz,
    label: coarFormatTimezoneLabel(tz),
  })),
);

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

onBeforeUnmount(() => maskitoInstance?.destroy());

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

// ============================================================
// Panel positioning
// ============================================================

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

// ============================================================
// Open / close
// ============================================================

function openPanel() {
  if (isDisabled.value || props.readonly || pickerBase.isOpen.value) return;
  if (valueInWorkingTz.value) {
    activeMonth.value = valueInWorkingTz.value.toPlainDate().toPlainYearMonth();
  }
  isSelectingDisplayTimezone.value = false;
  isEditingValueTimezone.value = false;
  timezoneSearchQuery.value = '';
  pickerBase.open();
  emit('opened');
  nextTick(() => requestAnimationFrame(() => { repositionPanel(); installListeners(); }));
}

function closePanel() {
  if (!pickerBase.isOpen.value) return;
  pickerBase.close();
  removeListeners();
  isSelectingDisplayTimezone.value = false;
  isEditingValueTimezone.value = false;
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
// Actions
// ============================================================

function clearValue(event: Event) {
  event.stopPropagation();
  modelValue.value = null;
  pendingTime.value = null;
  displayValue.value = '';
}

function onDateSelected(date: Temporal.PlainDate) {
  const time = selectedTime.value ?? props.defaultTime;
  const pdt = date.toPlainDateTime({
    hour: time.hours,
    minute: coarRoundMinutesToStep(time.minutes, props.minuteStep),
  });
  // Use value's existing timezone, or the default timezone
  const tz = valueTimeZone.value ?? effectiveDefaultTimeZone.value;
  let zdt: Temporal.ZonedDateTime;
  if (workingTimeZone.value !== tz) {
    // Editing in display TZ but value lives in a different TZ:
    // Create in display TZ, then convert to value TZ preserving the instant
    const inDisplayTz = pdt.toZonedDateTime(workingTimeZone.value);
    zdt = inDisplayTz.withTimeZone(tz);
  } else {
    zdt = pdt.toZonedDateTime(tz);
  }
  zdt = clampZonedDateTime(zdt);
  modelValue.value = zdt;
}

function onTimeChanged(time: CoarTimeValue | null) {
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
// Timezone actions
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

/** Open the display timezone picker in the side column */
function openDisplayTimezonePicker() {
  isSelectingDisplayTimezone.value = true;
  timezoneSearchQuery.value = '';
  nextTick(() => tzSearchInputRef.value?.focus());
}

/** Close the display timezone picker */
function closeDisplayTimezonePicker() {
  isSelectingDisplayTimezone.value = false;
  timezoneSearchQuery.value = '';
}

/** Select a display timezone from the picker list */
function selectDisplayTimezone(tzId: string) {
  displayTimeZone.value = tzId;
  closeDisplayTimezonePicker();
}

/** Start editing the value timezone (footer) */
function startEditValueTimezone() {
  isEditingValueTimezone.value = true;
}

/** Change the value's timezone — keeps local time, changes TZ interpretation */
function changeValueTimezone(newTzId: string) {
  if (modelValue.value) {
    const pdt = modelValue.value.toPlainDateTime();
    modelValue.value = pdt.toZonedDateTime(newTzId);
  }
  isEditingValueTimezone.value = false;
}

function cancelEditValueTimezone() {
  isEditingValueTimezone.value = false;
}

// Timezone indicator icon name
const tzIndicatorIcon = computed(() => {
  switch (timezoneIndicatorState.value) {
    case 'home': return 'home';
    case 'location': return 'location';
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

    <!-- Trigger -->
    <div
      ref="triggerRef"
      role="combobox"
      :aria-expanded="pickerBase.isOpen.value"
      aria-haspopup="dialog"
      :aria-controls="pickerBase.isOpen.value ? panelId : undefined"
      :aria-labelledby="label ? labelId : undefined"
      :aria-invalid="hasError || undefined"
      class="coar-zdtp-trigger"
      :class="{
        'coar-zdtp-trigger--disabled': isDisabled,
        'coar-zdtp-trigger--readonly': readonly,
        'coar-zdtp-trigger--error': hasError,
        'coar-zdtp-trigger--open': pickerBase.isOpen.value,
      }"
      @keydown="onKeydown"
    >
      <!-- Clear button -->
      <button
        type="button"
        class="coar-zdtp-clear"
        :class="{ 'coar-zdtp-clear--hidden': !showClearButton }"
        aria-label="Clear value"
        tabindex="-1"
        :disabled="isDisabled"
        @click="clearValue"
      >
        <CoarIcon name="close" size="xs" />
      </button>

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

      <!-- Timezone inline label -->
      <span
        v-if="modelValue"
        class="coar-zdtp-tz-inline"
        :title="currentTimeZoneDisplayName"
      >
        {{ currentTimeZoneDisplayName }}
      </span>

      <!-- Timezone indicator icon -->
      <button
        type="button"
        class="coar-zdtp-tz-indicator"
        :class="{
          'coar-zdtp-tz-indicator--clickable': timezoneIndicatorClickable,
          'coar-zdtp-tz-indicator--disabled': !timezoneIndicatorClickable,
        }"
        :aria-label="`Timezone: ${currentTimeZoneDisplayName}. ${timezoneIndicatorClickable ? 'Click to toggle.' : ''}`"
        tabindex="-1"
        :disabled="isDisabled"
        @click.stop="toggleDisplayTimezone"
      >
        <CoarIcon :name="tzIndicatorIcon" size="xs" />
      </button>

      <!-- Calendar button -->
      <button
        type="button"
        class="coar-zdtp-btn"
        :disabled="isDisabled"
        aria-label="Open date and time picker"
        tabindex="-1"
        @click.stop="togglePanel"
      >
        <CoarIcon name="calendar" size="s" />
      </button>
    </div>

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

    <!-- Panel (Teleported) -->
    <Teleport to="body">
      <div
        v-if="pickerBase.isOpen.value"
        :id="panelId"
        ref="panelRef"
        class="coar-zdtp-panel"
        :class="{ 'coar-zdtp-panel--with-weeks': showWeekNumbers }"
        role="dialog"
        aria-modal="true"
        aria-label="Date, time and timezone picker"
        :style="{
          position: 'fixed',
          top: '0px',
          left: '0px',
          transform: `translate3d(${panelLeft}px, ${panelTop}px, 0)`,
          zIndex: 'var(--coar-z-overlay, 1000)',
        }"
        @keydown.escape.prevent="closePanel"
      >
        <!-- Panel body (two columns) -->
        <div class="coar-zdtp-body">
          <!-- Left Column: Calendar -->
          <div class="coar-zdtp-calendar-column">
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

            <!-- Today FAB -->
            <button
              v-if="showTodayFab"
              type="button"
              class="coar-zdtp-today-fab"
              aria-label="Jump to today's month"
              @click="scrollToTodayMonth"
            >
              <CoarIcon :name="todayMonthDirection === 'up' ? 'up' : 'down'" size="xs" />
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
                aria-label="Previous year"
                @click="previousYear"
              >
                <CoarIcon name="left" size="s" />
              </button>
              <span class="coar-zdtp-year">{{ currentYear }}</span>
              <button
                type="button"
                class="coar-zdtp-year-btn"
                :disabled="isNextYearDisabled"
                aria-label="Next year"
                @click="nextYear"
              >
                <CoarIcon name="right" size="s" />
              </button>
            </div>

            <div v-else class="coar-zdtp-side-header coar-zdtp-side-header--search">
              <input
                ref="tzSearchInputRef"
                v-model="timezoneSearchQuery"
                type="text"
                class="coar-zdtp-tz-search-input"
                placeholder="Search timezone..."
                @keydown.escape.stop="closeDisplayTimezonePicker"
              />
              <button
                type="button"
                class="coar-zdtp-tz-search-close"
                aria-label="Close timezone search"
                @click="closeDisplayTimezonePicker"
              >
                <CoarIcon name="close" size="xs" />
              </button>
            </div>

            <!-- Timezone picker list (replaces month grid + time + events) -->
            <div v-if="isSelectingDisplayTimezone" v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave' }" class="coar-zdtp-tz-picker-list">
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
              <div class="coar-zdtp-month-grid" role="listbox" aria-label="Months">
                <button
                  v-for="item in monthItems"
                  :key="item.month"
                  type="button"
                  class="coar-zdtp-month-item"
                  :class="{ 'coar-zdtp-month-item--active': item.isActive }"
                  role="option"
                  :aria-selected="item.isActive"
                  @click="selectMonth(item.yearMonth)"
                >
                  {{ item.name }}
                </button>
              </div>

              <!-- Time Picker -->
              <div class="coar-zdtp-time-section">
                <CoarTimePicker
                  :model-value="selectedTime ?? undefined"
                  :use24-hour="effectiveUse24Hour"
                  :minute-step="minuteStep"
                  :min="effectiveMinTime ?? undefined"
                  :max="effectiveMaxTime ?? undefined"
                  size="s"
                  @update:model-value="onTimeChanged"
                />
              </div>

              <!-- Display timezone button -->
              <div class="coar-zdtp-display-tz-label">Display Timezone</div>
              <button
                type="button"
                class="coar-zdtp-display-tz-btn"
                @click="openDisplayTimezonePicker"
              >
                <span class="coar-zdtp-display-tz-btn-label">
                  {{ coarFormatTimezoneLabel(effectiveDisplayTimeZone) }}
                </span>
                <CoarIcon name="down" size="xs" />
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
          <template v-if="!modelValue">
            <span class="coar-zdtp-footer-placeholder">
              <CoarIcon name="location" size="xs" />
              <span>Event timezone</span>
            </span>
          </template>

          <template v-else-if="isEditingValueTimezone">
            <div class="coar-zdtp-footer-edit">
              <select
                class="coar-zdtp-footer-tz-select"
                :value="valueTimeZone"
                @change="changeValueTimezone(($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="opt in timezoneOptions"
                  :key="opt.id"
                  :value="opt.id"
                >
                  {{ opt.label }}
                </option>
              </select>
              <button
                type="button"
                class="coar-zdtp-footer-cancel"
                aria-label="Cancel timezone edit"
                @click="cancelEditValueTimezone"
              >
                <CoarIcon name="close" size="xs" />
              </button>
            </div>
          </template>

          <template v-else>
            <div class="coar-zdtp-footer-display">
              <CoarIcon name="location" size="xs" class="coar-zdtp-footer-icon" />
              <span class="coar-zdtp-footer-tz-name">{{ valueTimeZoneLabel }}</span>
              <span class="coar-zdtp-footer-tz-value">{{ formatValueInValueTz() }}</span>
              <button
                type="button"
                class="coar-zdtp-footer-lock"
                aria-label="Change event timezone"
                @click="startEditValueTimezone"
              >
                <CoarIcon name="settings" size="xs" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
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

.coar-zdtp-trigger {
  display: flex;
  align-items: center;
  position: relative;
  height: var(--coar-component-m-height);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-zdtp-trigger:hover:not(
    .coar-zdtp-trigger--disabled
  ):not(
    .coar-zdtp-trigger--readonly
  ):not(
    .coar-zdtp-trigger--error
  ) {
  border-color: var(--coar-border-input-hover);
}

.coar-zdtp-trigger--open:not(.coar-zdtp-trigger--error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-zdtp-trigger--error {
  border-color: var(--coar-border-semantic-error);
}

.coar-zdtp-trigger--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.coar-zdtp-trigger--readonly {
  background: var(--coar-surface-neutral-secondary);
  cursor: default;
}

/* ========================================
   CLEAR BUTTON
   ======================================== */

.coar-zdtp-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 100%;
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

.coar-zdtp-clear:hover { opacity: 1; color: var(--coar-icon-neutral-primary); }
.coar-zdtp-clear--hidden { opacity: 0; pointer-events: none; }

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
  padding: 0 var(--coar-spacing-s);
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  color: var(--coar-text-neutral-primary);
}

.coar-zdtp-input::placeholder {
  color: var(--coar-text-neutral-disabled);
}

/* ========================================
   TIMEZONE INLINE LABEL (on trigger border)
   ======================================== */

.coar-zdtp-tz-inline {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 var(--coar-spacing-xs);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* ========================================
   CALENDAR BUTTON
   ======================================== */

.coar-zdtp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-component-m-height);
  height: 100%;
  flex-shrink: 0;
  border: none;
  border-left: 1px solid var(--coar-border-input);
  border-radius: 0 var(--coar-radius-xs) var(--coar-radius-xs) 0;
  background: var(--coar-surface-neutral-secondary);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-zdtp-btn:hover:not(:disabled) {
  background: var(--coar-surface-neutral-tertiary);
  color: var(--coar-icon-neutral-primary);
}

.coar-zdtp-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ========================================
   SIZE VARIANTS
   ======================================== */

.coar-zdtp--xs .coar-zdtp-trigger { height: var(--coar-component-xs-height); }
.coar-zdtp--xs .coar-zdtp-btn { width: var(--coar-component-xs-height); }
.coar-zdtp--xs .coar-zdtp-input { font-size: var(--coar-component-xs-font-size); }

.coar-zdtp--s .coar-zdtp-trigger { height: var(--coar-component-s-height); }
.coar-zdtp--s .coar-zdtp-btn { width: var(--coar-component-s-height); }
.coar-zdtp--s .coar-zdtp-input { font-size: var(--coar-body-small-base-size); }

.coar-zdtp--l .coar-zdtp-trigger { height: var(--coar-component-l-height); }
.coar-zdtp--l .coar-zdtp-btn { width: var(--coar-component-l-height); }

/* ========================================
   PANEL
   ======================================== */

.coar-zdtp-panel {
  display: flex;
  flex-direction: column;
  min-width: 480px;
  max-width: 600px;
  max-height: 440px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  overflow: hidden;
}

.coar-zdtp-panel--with-weeks {
  min-width: 528px;
  max-width: 648px;
}

/* ========================================
   PANEL BODY (two columns)
   ======================================== */

.coar-zdtp-body {
  display: flex;
  flex-direction: row;
  flex: 0 0 auto;
  min-height: 0;
  height: 330px;
  overflow: hidden;
}

/* ========================================
   CALENDAR COLUMN
   ======================================== */

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
  background: var(--coar-surface-neutral-primary);
  box-shadow: var(--coar-shadow-s);
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  z-index: 10;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out), transform var(--coar-duration-fast) var(--coar-ease-out);
}
.coar-zdtp-today-fab:hover { background: var(--coar-surface-neutral-secondary); color: var(--coar-icon-neutral-primary); }
.coar-zdtp-today-fab:active { transform: scale(0.95); }

/* ========================================
   SIDE COLUMN
   ======================================== */

.coar-zdtp-side-column {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  background: var(--coar-background-neutral-secondary);
  border-left: 1px solid var(--coar-border-neutral-tertiary);
}

/* ========================================
   SIDE HEADER (year stepper / tz search)
   ======================================== */

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
.coar-zdtp-year-btn:hover:not(:disabled) { opacity: 1; background: var(--coar-surface-neutral-tertiary); }
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
.coar-zdtp-tz-search-close:hover { background: var(--coar-surface-neutral-tertiary); }

/* ========================================
   TIMEZONE PICKER LIST
   ======================================== */

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
  background: var(--coar-surface-neutral-tertiary);
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

/* ========================================
   MONTH GRID (4-column)
   ======================================== */

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
.coar-zdtp-month-item:hover { background: var(--coar-surface-neutral-tertiary); }
.coar-zdtp-month-item--active {
  background: var(--coar-surface-accent-secondary);
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-body-small-bold-weight);
}

/* ========================================
   TIME SECTION
   ======================================== */

.coar-zdtp-time-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  flex-shrink: 0;
}

/* ========================================
   DISPLAY TIMEZONE BUTTON
   ======================================== */

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
  background: var(--coar-surface-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

.coar-zdtp-display-tz-btn-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========================================
   EVENTS
   ======================================== */

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

/* ========================================
   FOOTER (value timezone bar)
   ======================================== */

.coar-zdtp-footer {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 var(--coar-spacing-s);
  border-top: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  flex-shrink: 0;
}

.coar-zdtp-footer--differs {
  background: var(--coar-surface-accent-secondary);
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
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-bold-weight);
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
  background: var(--coar-surface-neutral-tertiary);
}

/* ========================================
   FOOTER EDIT MODE
   ======================================== */

.coar-zdtp-footer-edit {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  width: 100%;
}

.coar-zdtp-footer-tz-select {
  flex: 1;
  min-width: 0;
  height: 26px;
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  padding: 0 var(--coar-spacing-xs);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  background: var(--coar-surface-input);
  outline: none;
  cursor: pointer;
}
.coar-zdtp-footer-tz-select:focus {
  border-color: var(--coar-border-accent-primary);
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
  background: var(--coar-surface-neutral-tertiary);
}

/* ========================================
   FORM FIELD MESSAGE
   ======================================== */

.coar-form-field-message {
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  min-height: 1.2em;
}
.coar-form-field-message:empty { visibility: hidden; }
.coar-form-field-message--error { color: var(--coar-text-semantic-error-bold); }
</style>
