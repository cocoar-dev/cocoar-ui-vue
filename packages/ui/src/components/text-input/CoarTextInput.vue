<script setup lang="ts">
import { computed, ref, inject, useTemplateRef } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type CoarTextInputSize = 'xs' | 's' | 'm' | 'l';

export interface CoarTextInputProps {
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Input size */
  size?: CoarTextInputSize;
  /** Number of visible text rows (1 = single-line, 2+ = textarea) */
  rows?: number;
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
  /** Text displayed before the input value */
  prefix?: string;
  /** Text displayed after the input value */
  suffix?: string;
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
  /** HTML autocomplete attribute */
  autocomplete?: string;
  /** Maximum character length */
  maxlength?: number;
}

const props = withDefaults(defineProps<CoarTextInputProps>(), {
  placeholder: '',
  size: 'm',
  rows: 1,
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  clearable: true,
  prefix: '',
  suffix: '',
  id: '',
  name: '',
  autocomplete: '',
  maxlength: undefined,
});

const { t } = useI18n();

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  focused: [event: FocusEvent];
  blurred: [event: FocusEvent];
  clear: [];
}>();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const isFocused = ref(false);
const inputElement = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>('inputElement');

const autoId = `coar-text-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);

const isMultiline = computed(() => props.rows > 1);
const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

const showClearButton = computed(() =>
  props.clearable && model.value.length > 0 && !props.disabled && !props.readonly
);

// The clear button keeps its layout slot whenever clearing is possible, and is
// only visually hidden while empty — so the field doesn't resize on first
// keystroke when the button would otherwise appear.
const clearSlotActive = computed(() =>
  props.clearable && !props.disabled && !props.readonly
);

const hostClasses = computed(() => [
  'coar-text-input-host',
  `coar-text-input--${props.size}`,
  { 'coar-text-input--multiline': isMultiline.value },
]);

const containerClasses = computed(() => [
  'coar-text-input-container',
  {
    'coar-text-input-focused': isFocused.value,
    'coar-text-input-disabled': props.disabled,
    'coar-text-input-readonly': props.readonly,
    'coar-text-input-error': hasError.value,
  },
]);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  model.value = target.value;
}

function onFocus(event: FocusEvent) {
  isFocused.value = true;
  emit('focused', event);
}

function onBlur(event: FocusEvent) {
  isFocused.value = false;
  emit('blurred', event);
}

function onClear() {
  model.value = '';
  emit('clear');
  inputElement.value?.focus();
}
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-text-input-wrapper">
      <!-- Input Container -->
      <div :class="containerClasses">
        <!-- Prefix (single-line only) -->
        <span v-if="!isMultiline" class="coar-text-input-prefix">
          <template v-if="prefix">{{ prefix }}</template>
          <slot name="prefix" />
        </span>

        <!-- Input Element (single-line) -->
        <input
          v-if="!isMultiline"
          :id="inputId"
          ref="inputElement"
          :name="name"
          type="text"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :autocomplete="autocomplete || undefined"
          :maxlength="maxlength"
          :aria-describedby="describedBy"
          :aria-invalid="hasError ? 'true' : undefined"
          class="coar-text-input-field"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />

        <!-- Textarea (multiline) -->
        <textarea
          v-else
          :id="inputId"
          ref="inputElement"
          :name="name"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :maxlength="maxlength"
          :aria-describedby="describedBy"
          :aria-invalid="hasError ? 'true' : undefined"
          :rows="rows"
          class="coar-text-input-field coar-text-input-textarea"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />

        <!-- Suffix (single-line only) -->
        <span v-if="!isMultiline" class="coar-text-input-suffix">
          <template v-if="suffix">{{ suffix }}</template>
          <slot name="suffix" />
        </span>

        <!-- Clear button -->
        <button
          v-if="clearSlotActive"
          type="button"
          class="coar-text-input-clear"
          :class="{
            'coar-text-input-clear--multiline': isMultiline,
            'coar-text-input-clear--hidden': !showClearButton,
          }"
          tabindex="-1"
          :aria-hidden="!showClearButton || undefined"
          :aria-label="t('coar.ui.textInput.clear', undefined, 'Clear')"
          @click="onClear"
        >
          <CoarIcon name="x" source="coar-builtin" size="auto" />
        </button>

        <!-- Suffix Actions (single-line only) -->
        <span v-if="!isMultiline" class="coar-text-input-suffix-actions">
          <slot name="suffixAction" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-text-input-host {
  display: block;
}

/* Container */
.coar-text-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Input Container */
.coar-text-input-container {
  position: relative;
  display: flex;
  align-items: center;
  height: var(--coar-component-m-height);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  transition:
    border-color var(--coar-duration-fast) var(--coar-ease-out),
    box-shadow var(--coar-duration-fast) var(--coar-ease-out);
  overflow: hidden;
}

/* Multiline container adjustments */
.coar-text-input--multiline .coar-text-input-container {
  height: auto;
  min-height: var(--coar-component-m-height);
  align-items: flex-start;
}

/* Size variants */
.coar-text-input--xs .coar-text-input-container { height: var(--coar-component-xs-height); }
.coar-text-input--s .coar-text-input-container { height: var(--coar-component-s-height); }
.coar-text-input--l .coar-text-input-container { height: var(--coar-component-l-height); }

/* Multiline overrides for sizes */
.coar-text-input--multiline.coar-text-input--xs .coar-text-input-container,
.coar-text-input--multiline.coar-text-input--s .coar-text-input-container,
.coar-text-input--multiline.coar-text-input--m .coar-text-input-container,
.coar-text-input--multiline.coar-text-input--l .coar-text-input-container {
  height: auto;
}

/* Size-specific typography */
.coar-text-input--xs .coar-text-input-field { font-size: var(--coar-component-xs-font-size); }
.coar-text-input--s .coar-text-input-field { font-size: var(--coar-component-s-font-size); }
.coar-text-input--l .coar-text-input-field { font-size: var(--coar-component-l-font-size); }

.coar-text-input-container:hover:not(.coar-text-input-disabled):not(.coar-text-input-readonly):not(
    .coar-text-input-error
  ):not(.coar-text-input-focused) {
  border-color: var(--coar-border-input-hover);
}

/* Focus state */
.coar-text-input-container.coar-text-input-focused:not(.coar-text-input-error) {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
  outline: none;
}

.coar-text-input-container.coar-text-input-disabled {
  background: var(--coar-surface-input-disabled);
  border-color: var(--coar-border-input);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-text-input-container.coar-text-input-readonly {
  background: var(--coar-surface-input);
  border-color: var(--coar-border-input);
  cursor: default;
}

/* Error state */
.coar-text-input-container.coar-text-input-error {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-text-input-container.coar-text-input-error.coar-text-input-focused {
  border-color: var(--coar-border-semantic-error-bold);
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
  outline: none;
}

.coar-text-input-container.coar-text-input-error:hover:not(.coar-text-input-disabled) {
  border-color: var(--coar-border-semantic-error-bold);
}

/* Input Field */
.coar-text-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 calc((var(--coar-spacing-s) + var(--coar-spacing-xs)) * var(--coar-component-density, 1));
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
}

/* Textarea specific */
.coar-text-input-textarea {
  padding: var(--coar-spacing-s);
  resize: vertical;
  min-height: calc(var(--coar-component-m-height) + var(--coar-component-m-height));
}

.coar-text-input--xs .coar-text-input-textarea {
  min-height: calc(var(--coar-component-xs-height) + var(--coar-component-xs-height));
}

.coar-text-input--s .coar-text-input-textarea {
  min-height: calc(var(--coar-component-s-height) + var(--coar-component-s-height));
}

.coar-text-input--l .coar-text-input-textarea {
  min-height: calc(var(--coar-component-l-height) + var(--coar-component-l-height));
}

.coar-text-input-field::placeholder {
  color: var(--coar-text-placeholder);
}

.coar-text-input-field:disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-text-input-field:read-only {
  cursor: default;
}

/* Prefix */
.coar-text-input-prefix {
  display: inline-flex;
  align-items: center;
  padding-left: var(--coar-spacing-s);
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-text-input-prefix:empty {
  padding-left: 0;
  flex-basis: 0;
}

/* Suffix */
.coar-text-input-suffix {
  display: inline-flex;
  align-items: center;
  padding-right: var(--coar-spacing-s);
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
  flex-shrink: 0;
}

.coar-text-input-suffix:empty {
  padding-right: 0;
  flex-basis: 0;
}

/* Suffix Actions */
.coar-text-input-suffix-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  padding-right: var(--coar-spacing-s);
  flex-shrink: 0;
}

.coar-text-input-suffix-actions:empty {
  display: none;
}

/* Clear Button */
.coar-text-input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  margin-right: var(--coar-spacing-s);
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

/* Empty state — keep the slot (no resize on first keystroke), just hide it. */
.coar-text-input-clear--hidden {
  visibility: hidden;
  pointer-events: none;
}

.coar-text-input-focused .coar-text-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-text-input-container:hover .coar-text-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-text-input--xs .coar-text-input-clear { font-size: var(--coar-component-xs-font-size); }
.coar-text-input--s .coar-text-input-clear { font-size: var(--coar-component-s-font-size); }
.coar-text-input--l .coar-text-input-clear { font-size: var(--coar-component-l-font-size); }

/* Multiline clear button positioning */
.coar-text-input-clear--multiline {
  position: absolute;
  top: var(--coar-spacing-s);
  right: var(--coar-spacing-s);
  margin-right: 0;
}

.coar-text-input-clear:hover {
  color: var(--coar-icon-neutral-primary);
}

.coar-text-input-clear:focus { outline: none; }
.coar-text-input-clear:focus-visible { color: var(--coar-icon-neutral-primary); }

/* Browser autofill styling */
.coar-text-input-field:-webkit-autofill,
.coar-text-input-field:-webkit-autofill:hover,
.coar-text-input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--coar-text-neutral-primary);
  -webkit-box-shadow: 0 0 0px 1000px var(--coar-surface-input) inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* Message styles are in shared/form-field-message.css */
</style>
