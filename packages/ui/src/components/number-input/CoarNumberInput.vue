<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, inject, useTemplateRef } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon, type CoarIconSize } from '../icon';
import CoarInputFrame from '../input-frame/CoarInputFrame.vue';
import type { CoarInputAppearance, CoarInputWidth } from '../input-frame/types';
import { FORM_FIELD_INJECTION_KEY, provideNoFormField } from '../form-field/constants';
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
  /** `inline`: no border or surface until hovered or edited (Preview) */
  appearance?: CoarInputAppearance;
  /** `content`: as wide as the value or placeholder and its affixes (Preview) */
  width?: CoarInputWidth;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment for arrows/keyboard */
  step?: number;
  /** Number of decimal places; `null`: as many as the value has (Preview) */
  decimals?: number | null;
  /**
   * The value is stored as typed or not at all: no mask, rounding or clamping (Preview).
   * Accepts the locale's decimal separator or a point. Other text stays in the field,
   * marked as an error, and `entry-refused` reports it.
   */
  exact?: boolean;
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
  appearance: 'outline',
  width: 'fill',
  min: undefined,
  max: undefined,
  step: 1,
  decimals: 0,
  exact: false,
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  clearable: false,
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
  /** `exact`: the text in the field is not a number it can store, or no longer so. */
  'entry-refused': [refused: boolean];
}>();

const { t } = useI18n();
const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);
// Prefix / suffix actions are fields of their own, not part of this field.
provideNoFormField();

const displayValue = ref('');
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');

let maskitoInstance: Maskito | null = null;

const autoId = `coar-number-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);

const entryRefused = ref(false);
const hasError = computed(() => props.error || entryRefused.value || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

const showClearButton = computed(
  () => props.clearable && model.value !== null && !props.disabled && !props.readonly,
);
// Render (and reserve the layout slot for) the clear button only when clearable —
// it's then hidden-not-removed while empty so the field doesn't resize on the first
// keystroke. When not clearable, no button and no reserved gap.
const clearSlotActive = computed(
  () => props.clearable && !props.disabled && !props.readonly,
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

const hostClasses = computed(() => [
  'coar-number-input-host',
  `coar-number-input--${props.size}`,
  { 'coar-number-input--content': props.width === 'content' },
]);

// Width in characters where `field-sizing: content` is not supported.
const contentSize = computed(() => Math.max(1, (displayValue.value || props.placeholder).length));

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

/** The shortest decimal text that reads back as this number, never with an exponent. */
function plainDecimal(value: number): string {
  const sign = value < 0 ? '-' : '';
  const [mantissa, exponent = '0'] = String(Math.abs(value)).split('e');
  const [integer, fraction = ''] = mantissa.split('.');
  const digits = integer + fraction;
  const point = integer.length + Number(exponent);
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return sign + digits + '0'.repeat(point - digits.length);
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

function fractionDigits(value: number): number {
  return plainDecimal(value).split('.')[1]?.length ?? 0;
}

function formatValue(value: number | null): string {
  if (value === null) return '';
  const format = resolvedNumberFormat.value;
  // toFixed switches to an exponent from 1e21 on.
  const formatted =
    props.decimals === null || Math.abs(value) >= 1e21 ? plainDecimal(value) : value.toFixed(props.decimals);
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

/** `exact`: the number the text states, or `null` when it states none this field can store. */
function parseExact(str: string): number | null {
  const decimal = resolvedNumberFormat.value.decimal.replace(/[\\\]^-]/g, '\\$&');
  const match = new RegExp(`^(-?)(\\d*)(?:[.${decimal}](\\d*))?$`).exec(str.trim().replace(/^\u2212/, '-'));
  if (!match || (!match[2] && !match[3])) return null;
  const fraction = match[3] ?? '';
  if (props.decimals !== null && fraction.replace(/0+$/, '').length > props.decimals) return null;
  const parsed = Number(`${match[1]}${match[2] || '0'}.${fraction || '0'}`);
  if (!Number.isFinite(parsed)) return null;
  return parsed === 0 ? 0 : parsed;
}

function setEntryRefused(refused: boolean) {
  if (entryRefused.value === refused) return;
  entryRefused.value = refused;
  emit('entry-refused', refused);
}

function roundValue(value: number): number {
  return props.decimals === null ? value : parseFloat(value.toFixed(props.decimals));
}

function clampValue(value: number): number {
  let clamped = value;
  if (props.min !== undefined && clamped < props.min) clamped = props.min;
  if (props.max !== undefined && clamped > props.max) clamped = props.max;
  return clamped;
}

// Text nobody changed is not an entry: the value may have more digits than the
// display, or lie outside min/max, and leaving the field must not rewrite it.
function commitValue() {
  if (displayValue.value === formatValue(model.value)) {
    setEntryRefused(false);
    return;
  }
  if (props.exact && displayValue.value.trim() !== '') {
    const parsed = parseExact(displayValue.value);
    setEntryRefused(parsed === null);
    if (parsed === null) return;
    model.value = parsed;
    displayValue.value = formatValue(parsed);
    return;
  }
  setEntryRefused(false);
  const parsed = parseValue(displayValue.value);
  if (parsed !== null) {
    const committed = roundValue(clampValue(parsed));
    model.value = committed;
    displayValue.value = formatValue(committed);
  } else {
    model.value = null;
    displayValue.value = '';
  }
}

function initMaskito() {
  destroyMaskito();
  const el = inputElement.value;
  if (!el || props.exact) return;
  const format = resolvedNumberFormat.value;
  const maskOptions = maskitoNumberOptionsGenerator({
    decimalSeparator: format.decimal,
    thousandSeparator: format.thousand,
    maximumFractionDigits: props.decimals ?? Infinity,
    // parseValue and formatValue read an ASCII minus.
    minusSign: '-',
    // No min or max here: the mask would clamp on blur a value nobody edited.
    // commitValue clamps what was typed.
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
    setEntryRefused(false);
  },
  { immediate: true },
);

// Re-initialize maskito when relevant props change
watch([() => props.decimals, () => props.exact, resolvedNumberFormat], () => {
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
  setEntryRefused(false);
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
  setEntryRefused(false);
  emit('clear');
  inputElement.value?.focus();
}

function stepBy(delta: number) {
  const current = model.value ?? 0;
  // Without fixed decimals the sum keeps the digits of its parts: 0.1 + 0.2 is 0.3.
  const next =
    props.decimals === null
      ? clampValue(parseFloat((current + delta).toFixed(Math.max(fractionDigits(current), fractionDigits(delta)))))
      : roundValue(clampValue(current + delta));
  model.value = next;
  displayValue.value = formatValue(next);
  setEntryRefused(false);
}

function increment() {
  if (props.disabled || props.readonly || !canIncrement.value) return;
  stepBy(props.step);
}

function decrement() {
  if (props.disabled || props.readonly || !canDecrement.value) return;
  stepBy(-props.step);
}
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-number-input-wrapper">
      <!-- Single-line input shell owns box / radius / padding / states -->
      <CoarInputFrame
        mobile-sizing
        class="coar-number-input-frame"
        :size="size"
        :error="hasError"
        :appearance="appearance"
        :segment-start="!!$slots.prefixAction"
        :segment-end="!!$slots.suffixAction"
        :disabled="disabled"
        :readonly="readonly"
      >
        <!-- Clear (left) + prefix → leading affix (only when there's real content,
             so the frame's has-leading padding logic stays correct) -->
        <template v-if="clearSlotActive || prefix || $slots.prefix || $slots.prefixAction" #leading>
          <span v-if="$slots.prefixAction" class="coar-number-input-actions">
            <slot name="prefixAction" :disabled="disabled" :readonly="readonly" />
          </span>
          <button
            v-if="clearSlotActive"
            type="button"
            class="coar-number-input-clear"
            :class="{ 'coar-number-input-clear--hidden': !showClearButton }"
            tabindex="-1"
            :aria-label="t('coar.ui.numberInput.clear', undefined, 'Clear')"
            @click="onClear"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>
          <span v-if="prefix || $slots.prefix" class="coar-number-input-prefix">
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
          :size="width === 'content' ? contentSize : undefined"
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

        <!-- Suffix → trailing affix (only when present) -->
        <template v-if="suffix || $slots.suffix || $slots.suffixAction" #trailing>
          <span v-if="suffix || $slots.suffix" class="coar-number-input-suffix">
            <template v-if="suffix">{{ suffix }}</template>
            <slot name="suffix" />
          </span>
          <span v-if="$slots.suffixAction" class="coar-number-input-actions">
            <slot name="suffixAction" :disabled="disabled" :readonly="readonly" />
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

/* Content width: the field is as wide as its value or placeholder (the `size`
   attribute is the fallback without field-sizing), the box at most the line. */
.coar-number-input--content {
  display: inline-block;
  inline-size: max-content;
  max-inline-size: 100%;
}
.coar-number-input--content .coar-number-input-field {
  field-sizing: content;
  /* An empty field without placeholder stays a target to click into. */
  min-inline-size: 2ch;
}

.coar-number-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Box / radius / size / states owned by CoarInputFrame. */

/* Size-specific typography */
.coar-number-input--xs .coar-number-input-field {
  font-size: max(var(--coar-field-xs-font-size, var(--coar-field-xs-default-font-size, var(--coar-field-font-size, var(--coar-component-xs-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
}

.coar-number-input--s .coar-number-input-field {
  font-size: max(var(--coar-field-s-font-size, var(--coar-field-s-default-font-size, var(--coar-field-font-size, var(--coar-component-s-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
}

.coar-number-input--l .coar-number-input-field {
  font-size: max(var(--coar-field-l-font-size, var(--coar-field-l-default-font-size, var(--coar-field-font-size, var(--coar-component-l-font-size)))), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
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
  font-size: max(var(--coar-field-font-size, var(--coar-body-small-base-size)), var(--coar-control-min-font-size, 0px), var(--coar-field-min-font-size, 0px));
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
/* Prefix and suffix actions: interactive content such as an inline select,
   in the field's own text style rather than the muted affix style. */
.coar-number-input-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  flex-shrink: 0;
}

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
  min-width: var(--coar-control-min-target-size, auto);
  min-height: var(--coar-control-min-target-size, auto);
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
  opacity: var(--coar-control-clear-opacity, 0.4);
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
  /* base cell width + the natural icon-edge↔cell-edge gap (= (w − iconW) / 2,
     measured per size: 4/6/6/6 for xs/s/m/l). The outer button reuses that gap as
     its compact (separator-side) inset so the +/− icons keep an even rhythm. */
  --coar-number-btn-w: 28px;
  --coar-number-btn-inner: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-number-btn-w);
  min-width: var(--coar-control-min-target-size, auto);
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
  --coar-number-btn-inner: 4px;
}
.coar-number-input--s .coar-number-input-button {
  --coar-number-btn-w: 24px;
}
.coar-number-input--l .coar-number-input-button {
  --coar-number-btn-w: 32px;
}

/* The outer (last) stepper button meets the frame's rounded cap, so it must follow
   the SAME rule as CoarInputFrameButton: its icon's outer edge lands at
   max(field-pad, corner) from the frame edge — identical to the clear / eye /
   chevron / calendar icons. Switch this one cell from fixed-width-centred to the
   padding model: a compact inner (separator-side) inset, and an outer inset that
   tracks BOTH the padding token and the radius. Inner buttons stay fixed-width. */
.coar-number-input-buttons .coar-number-input-button:last-child {
  width: auto;
  padding-left: var(--coar-number-btn-inner);
  padding-right: max(
    var(--coar-number-btn-inner),
    var(--coar-field-pad),
    var(--coar-input-corner, 0px)
  );
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
