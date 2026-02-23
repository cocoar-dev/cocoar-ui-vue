<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { CoarIcon, type CoarIconSize } from '../icon';
import { Maskito } from '@maskito/core';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';

/** Configuration for number formatting */
export interface NumberFormatConfig {
  readonly decimal: string;
  readonly thousand: string;
}

export type CoarNumberInputSize = 'xs' | 's' | 'm' | 'l';
export type CoarNumberInputStepperButtons = 'none' | 'increment' | 'decrement' | 'both';

export interface CoarNumberInputProps {
  /** Label text displayed above the input */
  label?: string;
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Input size */
  size?: CoarNumberInputSize;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment for arrows/keyboard */
  step?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Disables the input */
  disabled?: boolean;
  /** Makes the input read-only */
  readonly?: boolean;
  /** Marks the input as required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Hint text displayed below the input */
  hint?: string;
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Stepper button mode */
  stepperButtons?: CoarNumberInputStepperButtons;
  /** Text displayed before the input value */
  prefix?: string;
  /** Text displayed after the input value */
  suffix?: string;
  /** Locale for number formatting (e.g. 'de-AT', 'en-US') */
  locale?: string;
  /** Explicit number format configuration */
  numberFormat?: NumberFormatConfig;
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
}

const props = withDefaults(defineProps<CoarNumberInputProps>(), {
  label: '',
  placeholder: '',
  size: 'm',
  min: undefined,
  max: undefined,
  step: 1,
  decimals: 0,
  disabled: false,
  readonly: false,
  required: false,
  error: '',
  hint: '',
  clearable: true,
  stepperButtons: 'none',
  prefix: '',
  suffix: '',
  locale: undefined,
  numberFormat: undefined,
  id: '',
  name: '',
});

const model = defineModel<number | null>({ default: null });

const emit = defineEmits<{
  focused: [event: FocusEvent];
  blurred: [event: FocusEvent];
  clear: [];
}>();

const displayValue = ref('');
const isFocused = ref(false);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartValue = ref(0);
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');

let maskitoInstance: Maskito | null = null;

const autoId = `coar-number-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || autoId);
const messageId = computed(() => `${inputId.value}-message`);

const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);

const showClearButton = computed(() =>
  props.clearable && model.value !== null && !props.disabled && !props.readonly
);

const showIncrementButton = computed(() =>
  props.stepperButtons === 'increment' || props.stepperButtons === 'both'
);
const showDecrementButton = computed(() =>
  props.stepperButtons === 'decrement' || props.stepperButtons === 'both'
);
const showButtons = computed(() =>
  (showIncrementButton.value || showDecrementButton.value) && !props.disabled && !props.readonly
);

const canDecrement = computed(() => {
  if (model.value === null || props.min === undefined) return true;
  return model.value > props.min;
});

const canIncrement = computed(() => {
  if (model.value === null || props.max === undefined) return true;
  return model.value < props.max;
});

const iconSize = computed<CoarIconSize>(() => {
  const sizeMap: Record<CoarNumberInputSize, CoarIconSize> = { xs: 'xs', s: 'xs', m: 's', l: 'm' };
  return sizeMap[props.size];
});

const hostClasses = computed(() => [
  'coar-number-input-host',
  `coar-number-input--${props.size}`,
]);

const containerClasses = computed(() => [
  'coar-number-input-container',
  {
    'coar-number-input-focused': isFocused.value,
    'coar-number-input-disabled': props.disabled,
    'coar-number-input-readonly': props.readonly,
    'coar-number-input-error': hasError.value,
    'coar-number-input-dragging': isDragging.value,
  },
]);

/**
 * Resolved number format with priority chain:
 * 1. Explicit numberFormat prop
 * 2. Browser Intl.NumberFormat detection with locale
 * 3. Fallback { decimal: '.', thousand: '' }
 */
const resolvedNumberFormat = computed<NumberFormatConfig>(() => {
  if (props.numberFormat) return props.numberFormat;

  const locale = props.locale ?? navigator.language;
  if (locale) {
    try {
      const formatter = new Intl.NumberFormat(locale);
      const parts = formatter.formatToParts(1000.1);
      return {
        decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
        thousand: parts.find(p => p.type === 'group')?.value ?? '',
      };
    } catch { /* fall through */ }
  }

  return { decimal: '.', thousand: '' };
});

function formatValue(value: number | null): string {
  if (value === null) return '';
  const format = resolvedNumberFormat.value;
  const formatted = value.toFixed(props.decimals);
  return formatted.replace('.', format.decimal);
}

function parseValue(str: string): number | null {
  if (str.trim() === '') return null;
  const format = resolvedNumberFormat.value;
  const withoutThousands = format.thousand
    ? str.replace(new RegExp(`\\${format.thousand}`, 'g'), '')
    : str;
  const normalized = withoutThousands.replace(format.decimal, '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

function clampValue(value: number): number {
  let clamped = value;
  if (props.min !== undefined && clamped < props.min) clamped = props.min;
  if (props.max !== undefined && clamped > props.max) clamped = props.max;
  return clamped;
}

function commitValue() {
  const parsed = parseValue(displayValue.value);
  if (parsed !== null) {
    const clamped = clampValue(parsed);
    const rounded = parseFloat(clamped.toFixed(props.decimals));
    model.value = rounded;
  } else {
    model.value = null;
    displayValue.value = '';
  }
}

function initMaskito() {
  destroyMaskito();
  const el = inputElement.value;
  if (!el) return;
  const format = resolvedNumberFormat.value;
  const maskOptions = maskitoNumberOptionsGenerator({
    decimalSeparator: format.decimal,
    thousandSeparator: format.thousand,
    precision: props.decimals,
    min: props.min,
    max: props.max,
  });
  maskitoInstance = new Maskito(el, maskOptions);
}

function destroyMaskito() {
  maskitoInstance?.destroy();
  maskitoInstance = null;
}

// Sync displayValue when model changes externally
watch(() => model.value, (newValue) => {
  displayValue.value = formatValue(newValue);
}, { immediate: true });

// Re-initialize maskito when relevant props change
watch([() => props.decimals, () => props.min, () => props.max, resolvedNumberFormat], () => {
  initMaskito();
});

onMounted(() => {
  initMaskito();
});

onBeforeUnmount(() => {
  destroyMaskito();
  // Clean up drag listeners
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  displayValue.value = target.value;
}

function onFocus(event: FocusEvent) {
  isFocused.value = true;
  emit('focused', event);
}

function onBlur(event: FocusEvent) {
  isFocused.value = false;
  commitValue();
  emit('blurred', event);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    increment();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    decrement();
  }
}

function onClear() {
  model.value = null;
  displayValue.value = '';
  emit('clear');
  inputElement.value?.focus();
}

function increment() {
  if (props.disabled || props.readonly || !canIncrement.value) return;
  const current = model.value ?? 0;
  const newValue = clampValue(current + props.step);
  const rounded = parseFloat(newValue.toFixed(props.decimals));
  model.value = rounded;
  displayValue.value = formatValue(rounded);
}

function decrement() {
  if (props.disabled || props.readonly || !canDecrement.value) return;
  const current = model.value ?? 0;
  const newValue = clampValue(current - props.step);
  const rounded = parseFloat(newValue.toFixed(props.decimals));
  model.value = rounded;
  displayValue.value = formatValue(rounded);
}

// Figma-style drag to change value
function onDragStart(event: MouseEvent) {
  if (props.disabled || props.readonly) return;
  event.preventDefault();
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartValue.value = model.value ?? 0;
  document.body.style.cursor = 'ew-resize';
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(event: MouseEvent) {
  if (!isDragging.value) return;
  const deltaX = event.clientX - dragStartX.value;
  const sensitivity = 10;
  const stepCount = Math.round(deltaX / sensitivity);
  const newValue = clampValue(dragStartValue.value + stepCount * props.step);
  const rounded = parseFloat(newValue.toFixed(props.decimals));
  model.value = rounded;
  displayValue.value = formatValue(rounded);
}

function onDragEnd() {
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
  }
}
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-number-input-wrapper">
      <!-- Label -->
      <label
        v-if="label"
        :for="inputId"
        class="coar-number-input-label"
        :class="{ 'coar-number-input-label--draggable': !disabled && !readonly }"
        @mousedown="onDragStart"
      >
        {{ label }}
        <span v-if="required" class="coar-number-input-required">*</span>
      </label>

      <!-- Input Container -->
      <div :class="containerClasses">
        <!-- Clear button (left side) -->
        <button
          type="button"
          class="coar-number-input-clear"
          :class="{ 'coar-number-input-clear--hidden': !showClearButton }"
          tabindex="-1"
          aria-label="Clear"
          @click="onClear"
        >
          <CoarIcon name="x" source="coar-builtin" size="auto" />
        </button>

        <!-- Prefix -->
        <span class="coar-number-input-prefix">
          <template v-if="prefix">{{ prefix }}</template>
          <slot name="prefix" />
        </span>

        <!-- Input Element -->
        <input
          :id="inputId"
          ref="inputElement"
          :name="name"
          type="text"
          inputmode="decimal"
          :value="displayValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :aria-describedby="displayMessage ? messageId : undefined"
          :aria-invalid="hasError ? 'true' : undefined"
          :aria-valuemin="min"
          :aria-valuemax="max"
          :aria-valuenow="model ?? undefined"
          class="coar-number-input-field"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeyDown"
        />

        <!-- Suffix -->
        <span class="coar-number-input-suffix">
          <template v-if="suffix">{{ suffix }}</template>
          <slot name="suffix" />
        </span>

        <!-- Increment/Decrement Buttons -->
        <div v-if="showButtons" class="coar-number-input-buttons">
          <button
            v-if="showDecrementButton"
            type="button"
            class="coar-number-input-button coar-number-input-button--decrement"
            :disabled="!canDecrement"
            aria-label="Decrease value"
            tabindex="-1"
            @click="decrement"
          >
            <CoarIcon name="minus" source="coar-builtin" :size="iconSize" />
          </button>
          <button
            v-if="showIncrementButton"
            type="button"
            class="coar-number-input-button coar-number-input-button--increment"
            :disabled="!canIncrement"
            aria-label="Increase value"
            tabindex="-1"
            @click="increment"
          >
            <CoarIcon name="plus" source="coar-builtin" :size="iconSize" />
          </button>
        </div>
      </div>

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
  </div>
</template>

<style scoped>
.coar-number-input-host {
  display: block;
}

.coar-number-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Label */
.coar-number-input-label {
  display: block;
  margin-bottom: var(--coar-component-m-label-margin);
  font-family: var(--coar-body-small-bold-family);
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-number-input-label--draggable {
  cursor: ew-resize;
}

.coar-number-input-label--draggable:hover {
  color: var(--coar-text-accent-primary);
}

.coar-number-input-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

/* Input Container */
.coar-number-input-container {
  position: relative;
  display: flex;
  align-items: center;
  height: var(--coar-component-m-height);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: hidden;
}

/* Size variants */
.coar-number-input--xs .coar-number-input-container { height: var(--coar-component-xs-height); }
.coar-number-input--s .coar-number-input-container { height: var(--coar-component-s-height); }
.coar-number-input--l .coar-number-input-container { height: var(--coar-component-l-height); }

/* Size-specific typography */
.coar-number-input--xs .coar-number-input-field { font-size: var(--coar-component-xs-font-size); }
.coar-number-input--xs .coar-number-input-label {
  font-size: var(--coar-component-xs-label-font-size);
  margin-bottom: var(--coar-component-xs-label-margin);
}

.coar-number-input--s .coar-number-input-field { font-size: var(--coar-component-s-font-size); }
.coar-number-input--s .coar-number-input-label {
  font-size: var(--coar-component-s-label-font-size);
  margin-bottom: var(--coar-component-s-label-margin);
}

.coar-number-input--l .coar-number-input-field { font-size: var(--coar-component-l-font-size); }
.coar-number-input--l .coar-number-input-label {
  font-size: var(--coar-component-l-label-font-size);
  margin-bottom: var(--coar-component-l-label-margin);
}

.coar-number-input-container:hover:not(.coar-number-input-disabled):not(
    .coar-number-input-readonly
  ):not(.coar-number-input-error):not(.coar-number-input-focused) {
  border-color: var(--coar-border-input-hover);
}

/* Focus state */
.coar-number-input-container.coar-number-input-focused:not(.coar-number-input-error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
  outline: none;
}

.coar-number-input-container.coar-number-input-disabled {
  background: var(--coar-surface-input-disabled);
  border-color: var(--coar-border-input);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-number-input-container.coar-number-input-readonly {
  background: var(--coar-surface-input);
  border-color: var(--coar-border-input);
  cursor: default;
}

/* Error state */
.coar-number-input-container.coar-number-input-error {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-number-input-container.coar-number-input-error.coar-number-input-focused {
  border-color: var(--coar-border-semantic-error-bold);
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
  outline: none;
}

.coar-number-input-container.coar-number-input-error:hover:not(.coar-number-input-disabled) {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-number-input-container.coar-number-input-dragging {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

/* Input Field - right aligned for numbers */
.coar-number-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--coar-spacing-s);
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.coar-number-input-field::placeholder {
  color: var(--coar-text-neutral-tertiary);
  text-align: right;
}

.coar-number-input-field:disabled { color: var(--coar-text-neutral-disabled); cursor: not-allowed; }
.coar-number-input-field:read-only { cursor: default; }

/* Hide native spinner buttons */
.coar-number-input-field::-webkit-inner-spin-button,
.coar-number-input-field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.coar-number-input-field {
  -moz-appearance: textfield;
}

/* Prefix */
.coar-number-input-prefix {
  display: inline-flex;
  align-items: center;
  padding-left: var(--coar-spacing-s);
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-number-input-prefix:empty {
  padding-left: 0;
  flex-basis: 0;
}

/* Suffix */
.coar-number-input-suffix {
  display: inline-flex;
  align-items: center;
  padding-right: var(--coar-spacing-s);
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-number-input-suffix:empty {
  padding-right: 0;
  flex-basis: 0;
}

/* Clear Button (left side for number input) */
.coar-number-input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  margin-left: var(--coar-spacing-s);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
  flex-shrink: 0;
  opacity: 0.4;
}

.coar-number-input-focused .coar-number-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-number-input-container:hover .coar-number-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-number-input--xs .coar-number-input-clear { font-size: var(--coar-component-xs-font-size); }
.coar-number-input--s .coar-number-input-clear { font-size: var(--coar-component-s-font-size); }
.coar-number-input--l .coar-number-input-clear { font-size: var(--coar-component-l-font-size); }

.coar-number-input-clear--hidden {
  opacity: 0;
  pointer-events: none;
}

.coar-number-input-clear:hover { color: var(--coar-icon-neutral-primary); }
.coar-number-input-clear:focus { outline: none; }
.coar-number-input-clear:focus-visible { color: var(--coar-icon-neutral-primary); }

/* Browser autofill styling */
.coar-number-input-field:-webkit-autofill,
.coar-number-input-field:-webkit-autofill:hover,
.coar-number-input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--coar-text-neutral-primary);
  -webkit-box-shadow: 0 0 0px 1000px var(--coar-surface-input) inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* Increment/Decrement Buttons */
.coar-number-input-buttons {
  display: flex;
  flex-direction: row;
  height: 100%;
  border-left: 1px solid var(--coar-background-neutral-tertiary);
}

.coar-number-input-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.coar-number-input--xs .coar-number-input-button { width: 20px; }
.coar-number-input--s .coar-number-input-button { width: 24px; }
.coar-number-input--l .coar-number-input-button { width: 32px; }

.coar-number-input-button:hover:not(:disabled) {
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-primary);
}

.coar-number-input-button:active:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-number-input-button:disabled {
  color: var(--coar-icon-neutral-disabled);
  cursor: not-allowed;
}

.coar-number-input-button--decrement {
  border-right: 1px solid var(--coar-background-neutral-tertiary);
}

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
</style>
