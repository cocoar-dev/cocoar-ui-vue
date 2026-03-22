<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useL10n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import type { CoarTimePeriod, CoarTimeValue } from '../_shared/types';
import {
  coarConvertTo12Hour,
  coarConvertTo24Hour,
  coarDetect12HourFormat,
  coarIncrementHours,
  coarIncrementMinutes,
  coarRoundMinutesToStep,
} from '../_shared/time-helpers';

export type CoarTimePickerSize = 'xs' | 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    /** Size variant */
    size?: CoarTimePickerSize;
    /** Whether to use 24-hour format (true=24h, false=12h, 'auto'=detect from locale) */
    use24Hour?: boolean | 'auto';
    /** Step interval for minute selection */
    minuteStep?: 1 | 5 | 10 | 15;
    /** Whether the picker is disabled */
    disabled?: boolean;
    /** Whether the picker is readonly */
    readonly?: boolean;
    /** Locale for 12h/24h detection (overrides service locale) */
    locale?: string;
    /** Minimum allowed time */
    minTime?: CoarTimeValue | null;
    /** Maximum allowed time */
    maxTime?: CoarTimeValue | null;
    /** Accessible label */
    ariaLabel?: string;
  }>(),
  {
    size: 'm',
    use24Hour: 'auto',
    minuteStep: 5,
    disabled: false,
    readonly: false,
    locale: undefined,
    minTime: null,
    maxTime: null,
    ariaLabel: 'Time',
  },
);

const modelValue = defineModel<CoarTimeValue | null>({ default: null });

// Localization
const l10n = useL10n();

const effectiveLocale = computed(() => {
  return props.locale ?? l10n?.language.value ?? navigator.language;
});

// Internal state
const hours = ref(9);
const minutes = ref(0);
const period = ref<CoarTimePeriod>('AM');

// Sync external value → internal state
watch(
  modelValue,
  (val) => {
    if (val) {
      hours.value = val.hours;
      minutes.value = coarRoundMinutesToStep(val.minutes, props.minuteStep);
      period.value = val.hours >= 12 ? 'PM' : 'AM';
    }
  },
  { immediate: true },
);

// Computed
const is12HourFormat = computed(() => {
  if (props.use24Hour === true) return false;
  if (props.use24Hour === false) return true;
  return coarDetect12HourFormat(effectiveLocale.value);
});

const displayHours = computed(() => {
  if (is12HourFormat.value) {
    return coarConvertTo12Hour(hours.value).hours;
  }
  return hours.value;
});

const displayMinutes = computed(() => minutes.value);

const minHoursDisplay = computed(() => (is12HourFormat.value ? 1 : 0));
const maxHoursDisplay = computed(() => (is12HourFormat.value ? 12 : 23));

const iconSize = computed(() => (props.size === 'xs' ? 'xs' : 's'));

function timeToMinutes(time: CoarTimeValue): number {
  return time.hours * 60 + time.minutes;
}

// Boundary checks
const isIncrementHoursDisabled = computed(() => {
  if (!props.maxTime) return false;
  const nextHours = (hours.value + 1) % 24;
  return (
    timeToMinutes({ hours: nextHours, minutes: minutes.value }) >
    timeToMinutes(props.maxTime)
  );
});

const isDecrementHoursDisabled = computed(() => {
  if (!props.minTime) return false;
  const prevHours = (hours.value - 1 + 24) % 24;
  return (
    timeToMinutes({ hours: prevHours, minutes: minutes.value }) <
    timeToMinutes(props.minTime)
  );
});

const isIncrementMinutesDisabled = computed(() => {
  if (!props.maxTime) return false;
  let nextMinutes = minutes.value + props.minuteStep;
  let nextHours = hours.value;
  if (nextMinutes >= 60) {
    nextMinutes = nextMinutes % 60;
    nextHours = (nextHours + 1) % 24;
  }
  return (
    timeToMinutes({ hours: nextHours, minutes: nextMinutes }) >
    timeToMinutes(props.maxTime)
  );
});

const isDecrementMinutesDisabled = computed(() => {
  if (!props.minTime) return false;
  let prevMinutes = minutes.value - props.minuteStep;
  let prevHours = hours.value;
  if (prevMinutes < 0) {
    prevMinutes = 60 + prevMinutes;
    prevHours = (prevHours - 1 + 24) % 24;
  }
  return (
    timeToMinutes({ hours: prevHours, minutes: prevMinutes }) <
    timeToMinutes(props.minTime)
  );
});

const isAmDisabled = computed(() => {
  return props.minTime !== null && props.minTime!.hours >= 12;
});

const isPmDisabled = computed(() => {
  return props.maxTime !== null && props.maxTime!.hours < 12;
});

// Actions
function emitValue(): void {
  modelValue.value = { hours: hours.value, minutes: minutes.value };
}

function incrementHoursAction(): void {
  if (props.disabled || props.readonly || isIncrementHoursDisabled.value)
    return;

  if (is12HourFormat.value) {
    const currentDisplay = displayHours.value;
    let newDisplay = currentDisplay + 1;
    if (newDisplay > 12) newDisplay = 1;

    const new24h = coarConvertTo24Hour(newDisplay, period.value);
    hours.value = new24h;

    if (currentDisplay === 11) {
      togglePeriodAction();
      return;
    }
  } else {
    hours.value = coarIncrementHours(hours.value, 1);
  }
  emitValue();
}

function decrementHoursAction(): void {
  if (props.disabled || props.readonly || isDecrementHoursDisabled.value)
    return;

  if (is12HourFormat.value) {
    const currentDisplay = displayHours.value;
    let newDisplay = currentDisplay - 1;
    if (newDisplay < 1) newDisplay = 12;

    const new24h = coarConvertTo24Hour(newDisplay, period.value);
    hours.value = new24h;

    if (currentDisplay === 12) {
      togglePeriodAction();
      return;
    }
  } else {
    hours.value = coarIncrementHours(hours.value, -1);
  }
  emitValue();
}

function incrementMinutesAction(): void {
  if (props.disabled || props.readonly || isIncrementMinutesDisabled.value)
    return;

  const { minutes: newMinutes, hourDelta } = coarIncrementMinutes(
    minutes.value,
    1,
    props.minuteStep,
  );
  minutes.value = newMinutes;

  if (hourDelta !== 0) {
    hours.value = coarIncrementHours(hours.value, hourDelta);
    period.value = hours.value >= 12 ? 'PM' : 'AM';
  }
  emitValue();
}

function decrementMinutesAction(): void {
  if (props.disabled || props.readonly || isDecrementMinutesDisabled.value)
    return;

  const { minutes: newMinutes, hourDelta } = coarIncrementMinutes(
    minutes.value,
    -1,
    props.minuteStep,
  );
  minutes.value = newMinutes;

  if (hourDelta !== 0) {
    hours.value = coarIncrementHours(hours.value, hourDelta);
    period.value = hours.value >= 12 ? 'PM' : 'AM';
  }
  emitValue();
}

function togglePeriodAction(): void {
  if (props.disabled || props.readonly || !is12HourFormat.value) return;

  const newPeriod: CoarTimePeriod = period.value === 'AM' ? 'PM' : 'AM';
  if (newPeriod === 'AM' && isAmDisabled.value) return;
  if (newPeriod === 'PM' && isPmDisabled.value) return;

  period.value = newPeriod;
  hours.value = coarConvertTo24Hour(displayHours.value, newPeriod);
  emitValue();
}

// Keyboard
function onHoursKeydown(event: KeyboardEvent): void {
  if (props.disabled || props.readonly) return;
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    incrementHoursAction();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    decrementHoursAction();
  }
}

function onMinutesKeydown(event: KeyboardEvent): void {
  if (props.disabled || props.readonly) return;
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    incrementMinutesAction();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    decrementMinutesAction();
  }
}

function onPeriodKeydown(event: KeyboardEvent): void {
  if (props.disabled || props.readonly) return;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    togglePeriodAction();
  }
}

const sizeClass = computed(
  () => `coar-time-picker--${props.size}`,
);
</script>

<template>
  <div
    :class="[
      'coar-time-picker-host',
      sizeClass,
      { 'coar-time-picker--disabled': disabled, 'coar-time-picker--readonly': readonly },
    ]"
  >
    <div class="coar-time-picker" role="group" :aria-label="ariaLabel">
      <!-- Hours Spinner -->
      <div class="coar-time-picker__spinner coar-time-picker__hours">
        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--up"
          :disabled="disabled || readonly || isIncrementHoursDisabled"
          tabindex="-1"
          aria-label="Increase hours"
          @click="incrementHoursAction"
        >
          <CoarIcon name="chevron-up" :size="iconSize" />
        </button>

        <div
          class="coar-time-picker__value"
          role="spinbutton"
          tabindex="0"
          :aria-valuenow="displayHours"
          :aria-valuemin="minHoursDisplay"
          :aria-valuemax="maxHoursDisplay"
          aria-label="Hours"
          @keydown="onHoursKeydown"
        >
          {{ displayHours.toString().padStart(2, '0') }}
        </div>

        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--down"
          :disabled="disabled || readonly || isDecrementHoursDisabled"
          tabindex="-1"
          aria-label="Decrease hours"
          @click="decrementHoursAction"
        >
          <CoarIcon name="chevron-down" :size="iconSize" />
        </button>
      </div>

      <!-- Separator -->
      <span class="coar-time-picker__separator" aria-hidden="true">:</span>

      <!-- Minutes Spinner -->
      <div class="coar-time-picker__spinner coar-time-picker__minutes">
        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--up"
          :disabled="disabled || readonly || isIncrementMinutesDisabled"
          tabindex="-1"
          aria-label="Increase minutes"
          @click="incrementMinutesAction"
        >
          <CoarIcon name="chevron-up" :size="iconSize" />
        </button>

        <div
          class="coar-time-picker__value"
          role="spinbutton"
          tabindex="0"
          :aria-valuenow="displayMinutes"
          aria-valuemin="0"
          aria-valuemax="59"
          aria-label="Minutes"
          @keydown="onMinutesKeydown"
        >
          {{ displayMinutes.toString().padStart(2, '0') }}
        </div>

        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--down"
          :disabled="disabled || readonly || isDecrementMinutesDisabled"
          tabindex="-1"
          aria-label="Decrease minutes"
          @click="decrementMinutesAction"
        >
          <CoarIcon name="chevron-down" :size="iconSize" />
        </button>
      </div>

      <!-- AM/PM Selector (12-hour mode only) -->
      <div v-if="is12HourFormat" class="coar-time-picker__spinner coar-time-picker__period">
        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--up"
          :disabled="disabled || readonly || (period === 'AM' ? isPmDisabled : isAmDisabled)"
          tabindex="-1"
          aria-label="Toggle AM/PM"
          @click="togglePeriodAction"
        >
          <CoarIcon name="chevron-up" :size="iconSize" />
        </button>

        <div
          class="coar-time-picker__value coar-time-picker__period-value"
          role="spinbutton"
          tabindex="0"
          :aria-valuenow="period === 'AM' ? 0 : 1"
          aria-valuemin="0"
          aria-valuemax="1"
          :aria-valuetext="period"
          aria-label="AM/PM"
          @keydown="onPeriodKeydown"
        >
          {{ period }}
        </div>

        <button
          type="button"
          class="coar-time-picker__btn coar-time-picker__btn--down"
          :disabled="disabled || readonly || (period === 'AM' ? isPmDisabled : isAmDisabled)"
          tabindex="-1"
          aria-label="Toggle AM/PM"
          @click="togglePeriodAction"
        >
          <CoarIcon name="chevron-down" :size="iconSize" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   COAR TIME PICKER COMPONENT
   ======================================== */

.coar-time-picker-host {
  display: inline-block;
}

.coar-time-picker {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

/* ========================================
   SPINNER
   ======================================== */

.coar-time-picker__spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-2xs);
}

/* Up/Down Buttons */
.coar-time-picker__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-component-m-height);
  height: calc(var(--coar-component-m-height) * 0.6);
  padding: 0;
  border: none;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  opacity: 0;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-time-picker__btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-primary);
  opacity: 1;
}

.coar-time-picker__btn:active:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-time-picker__btn:disabled {
  color: var(--coar-icon-neutral-disabled);
  cursor: not-allowed;
}

/* Show buttons on hover/focus-within */
.coar-time-picker-host:hover .coar-time-picker__btn {
  opacity: 0.35;
}

.coar-time-picker-host:focus-within .coar-time-picker__btn {
  opacity: 0.35;
}

.coar-time-picker__btn:hover:not(:disabled) {
  opacity: 1;
}

/* Value Display */
.coar-time-picker__value {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--coar-component-m-height);
  height: var(--coar-component-m-height);
  padding: 0 var(--coar-spacing-s);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-base-weight);
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
  cursor: default;
  user-select: none;
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-time-picker__value:focus {
  outline: none;
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

/* ========================================
   SEPARATOR
   ======================================== */

.coar-time-picker__separator {
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-large-size);
  font-weight: var(--coar-body-bold-weight);
  color: var(--coar-text-neutral-secondary);
  user-select: none;
}

/* ========================================
   PERIOD SELECTOR (AM/PM)
   ======================================== */

.coar-time-picker__period {
  margin-left: var(--coar-spacing-xs);
}

.coar-time-picker__period-value {
  min-width: calc(var(--coar-component-m-height) * 1.1);
  font-weight: var(--coar-body-bold-weight);
}

/* ========================================
   SIZE VARIANTS
   ======================================== */

/* XS */
.coar-time-picker--xs .coar-time-picker__btn {
  width: var(--coar-component-xs-height);
  height: calc(var(--coar-component-xs-height) * 0.6);
}

.coar-time-picker--xs .coar-time-picker__value {
  min-width: var(--coar-component-xs-height);
  height: var(--coar-component-xs-height);
  padding: 0 var(--coar-spacing-xs);
  font-size: var(--coar-component-xs-font-size);
}

.coar-time-picker--xs .coar-time-picker__separator {
  font-size: var(--coar-body-base-size);
}

.coar-time-picker--xs .coar-time-picker__period-value {
  min-width: calc(var(--coar-component-xs-height) * 1.1);
}

/* S */
.coar-time-picker--s .coar-time-picker__btn {
  width: var(--coar-component-s-height);
  height: calc(var(--coar-component-s-height) * 0.6);
}

.coar-time-picker--s .coar-time-picker__value {
  min-width: var(--coar-component-s-height);
  height: var(--coar-component-s-height);
  padding: 0 var(--coar-spacing-s);
  font-size: var(--coar-component-s-font-size);
}

.coar-time-picker--s .coar-time-picker__separator {
  font-size: var(--coar-body-base-size);
}

.coar-time-picker--s .coar-time-picker__period-value {
  min-width: calc(var(--coar-component-s-height) * 1.1);
}

/* L */
.coar-time-picker--l .coar-time-picker__btn {
  width: var(--coar-component-l-height);
  height: calc(var(--coar-component-l-height) * 0.6);
}

.coar-time-picker--l .coar-time-picker__value {
  min-width: var(--coar-component-l-height);
  height: var(--coar-component-l-height);
  padding: 0 var(--coar-spacing-m);
  font-size: var(--coar-component-l-font-size);
}

.coar-time-picker--l .coar-time-picker__separator {
  font-size: var(--coar-body-large-size);
}

.coar-time-picker--l .coar-time-picker__period-value {
  min-width: calc(var(--coar-component-l-height) * 1.1);
}

/* ========================================
   DISABLED STATE
   ======================================== */

.coar-time-picker--disabled .coar-time-picker__value {
  background: var(--coar-surface-input-disabled);
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

/* ========================================
   READONLY STATE
   ======================================== */

.coar-time-picker--readonly .coar-time-picker__btn {
  display: none;
}

/* ========================================
   REDUCED MOTION
   ======================================== */

@media (prefers-reduced-motion: reduce) {
  .coar-time-picker__btn,
  .coar-time-picker__value {
    transition: none;
  }
}
</style>
