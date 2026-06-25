<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, inject, useTemplateRef } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon, type CoarIconSize } from '../icon';
import CoarInputFrame from '../input-frame/CoarInputFrame.vue';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
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
  /** Error state (boolean for standalone use; auto-injected from CoarFormField) */
  error?: boolean;
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
  placeholder: '',
  size: 'm',
  min: undefined,
  max: undefined,
  step: 1,
  decimals: 0,
  disabled: false,
  readonly: false,
  required: false,
  error: false,
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

const { t } = useI18n();
const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const displayValue = ref('');
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');

let maskitoInstance: Maskito | null = null;

const autoId = `coar-number-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

const showClearButton = computed(
  () => props.clearable && model.value !== null && !props.disabled && !props.readonly,
);

const showIncrementButton = computed(
  () => props.stepperButtons === 'increment' || props.stepperButtons === 'both',
);
const showDecrementButton = computed(
  () => props.stepperButtons === 'decrement' || props.stepperButtons === 'both',
);
const showButtons = computed(
  () =>
    (showIncrementButton.value || showDecrementButton.value) && !props.disabled && !props.readonly,
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

const hostClasses = computed(() => ['coar-number-input-host', `coar-number-input--${props.size}`]);

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
        decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
        thousand: parts.find((p) => p.type === 'group')?.value ?? '',
      };
    } catch {
      /* fall through */
    }
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
    maximumFractionDigits: props.decimals,
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
watch(
  () => model.value,
  (newValue) => {
    displayValue.value = formatValue(newValue);
  },
  { immediate: true },
);

// Re-initialize maskito when relevant props change
watch([() => props.decimals, () => props.min, () => props.max, resolvedNumberFormat], () => {
  initMaskito();
});

onMounted(() => {
  initMaskito();
});

onBeforeUnmount(() => {
  destroyMaskito();
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  displayValue.value = target.value;
}

function onFocus(event: FocusEvent) {
  emit('focused', event);
}

function onBlur(event: FocusEvent) {
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
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-number-input-wrapper">
      <!-- Single-line input shell owns box / radius / padding / states -->
      <CoarInputFrame
        class="coar-number-input-frame"
        :size="size"
        :error="hasError"
        :disabled="disabled"
        :readonly="readonly"
      >
        <!-- Clear (left) + prefix → leading affix -->
        <template #leading>
          <button
            type="button"
            class="coar-number-input-clear"
            :class="{ 'coar-number-input-clear--hidden': !showClearButton }"
            tabindex="-1"
            :aria-label="t('coar.ui.numberInput.clear', undefined, 'Clear')"
            @click="onClear"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>
          <span class="coar-number-input-prefix">
            <template v-if="prefix">{{ prefix }}</template>
            <slot name="prefix" />
          </span>
        </template>

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
          :aria-describedby="describedBy"
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

        <!-- Suffix → trailing affix -->
        <template #trailing>
          <span class="coar-number-input-suffix">
            <template v-if="suffix">{{ suffix }}</template>
            <slot name="suffix" />
          </span>
        </template>

        <!-- Stepper +/- → #actions (compact edge cluster; frame clips its outer corner) -->
        <template v-if="showButtons" #actions>
          <div class="coar-number-input-buttons">
            <button
              v-if="showDecrementButton"
              type="button"
              class="coar-number-input-button coar-number-input-button--decrement"
              :disabled="!canDecrement"
              :aria-label="t('coar.ui.numberInput.decrease', undefined, 'Decrease value')"
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
              :aria-label="t('coar.ui.numberInput.increase', undefined, 'Increase value')"
              tabindex="-1"
              @click="increment"
            >
              <CoarIcon name="plus" source="coar-builtin" :size="iconSize" />
            </button>
          </div>
        </template>
      </CoarInputFrame>
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

/* Box / radius / size / states owned by CoarInputFrame. */

/* Size-specific typography */
.coar-number-input--xs .coar-number-input-field {
  font-size: var(--coar-component-xs-font-size);
}

.coar-number-input--s .coar-number-input-field {
  font-size: var(--coar-component-s-font-size);
}

.coar-number-input--l .coar-number-input-field {
  font-size: var(--coar-component-l-font-size);
}

/* Input Field - right aligned for numbers. Horizontal padding owned by the frame. */
.coar-number-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
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
  color: var(--coar-text-placeholder);
  text-align: right;
}

.coar-number-input-field:disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}
.coar-number-input-field:read-only {
  cursor: default;
}

/* Hide native spinner buttons */
.coar-number-input-field::-webkit-inner-spin-button,
.coar-number-input-field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.coar-number-input-field {
  -moz-appearance: textfield;
}

/* Prefix / Suffix — outer field-pad owned by the frame's leading/trailing affix. */
.coar-number-input-prefix {
  display: inline-flex;
  align-items: center;
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-number-input-suffix {
  display: inline-flex;
  align-items: center;
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Clear Button (sits left of the value, inside the leading affix) */
.coar-number-input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
  opacity: 0.4;
}

/*
 * `:not(--hidden)` is required: the clear button uses opacity-based hiding
 * (NOT `display: none`) to keep the layout stable on appear/disappear, since
 * the X sits to the LEFT of the input. Without `:not`, the focused/hover
 * `opacity: 1` override outranks `.coar-number-input-clear--hidden { opacity: 0 }`
 * (same specificity, defined later) and the X surfaces even with `clearable: false`.
 */
.coar-number-input-frame:focus-within .coar-number-input-clear:not(.coar-number-input-clear--hidden),
.coar-number-input-frame:hover .coar-number-input-clear:not(.coar-number-input-clear--hidden) {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-number-input--xs .coar-number-input-clear {
  font-size: var(--coar-component-xs-font-size);
}
.coar-number-input--s .coar-number-input-clear {
  font-size: var(--coar-component-s-font-size);
}
.coar-number-input--l .coar-number-input-clear {
  font-size: var(--coar-component-l-font-size);
}

.coar-number-input-clear--hidden {
  opacity: 0;
  pointer-events: none;
}

.coar-number-input-clear:hover {
  color: var(--coar-icon-neutral-primary);
}
.coar-number-input-clear:focus {
  outline: none;
}
.coar-number-input-clear:focus-visible {
  color: var(--coar-icon-neutral-primary);
}

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
  --coar-number-btn-w: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* content-box so the last button's corner padding GROWS the box (pushes the icon
     clear of the rounded cap) instead of squeezing the centred icon inward. */
  box-sizing: content-box;
  width: var(--coar-number-btn-w);
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-number-input--xs .coar-number-input-button {
  --coar-number-btn-w: 20px;
}
.coar-number-input--s .coar-number-input-button {
  --coar-number-btn-w: 24px;
}
.coar-number-input--l .coar-number-input-button {
  --coar-number-btn-w: 32px;
}

/* The outer (last) stepper button meets the frame's rounded cap. Mirror the
   CoarInputFrameButton rule: its icon-to-edge clearance must reach the corner
   radius at full/pill radius. The icon is centred in the base width (→ w/2 from
   the right), so add only the shortfall. At default radius (corner ≤ w/2) this is
   0 → unchanged compact pair. */
.coar-number-input-buttons .coar-number-input-button:last-child {
  padding-right: max(0px, calc(var(--coar-input-corner, 0px) - var(--coar-number-btn-w) / 2));
}

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

@media (prefers-reduced-motion: reduce) {
  .coar-number-input-frame,
  .coar-number-input-clear,
  .coar-number-input-button {
    transition-duration: 0s;
  }
}
</style>
