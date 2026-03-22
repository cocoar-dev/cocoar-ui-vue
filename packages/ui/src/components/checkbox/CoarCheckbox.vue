<script setup lang="ts">
import { computed, ref, watch, useTemplateRef, inject } from 'vue';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type CoarCheckboxSize = 'xs' | 's' | 'm' | 'l';

export interface CoarCheckboxProps {
  /** Label text displayed next to the checkbox */
  label?: string;
  /** Indeterminate visual state (e.g. "select all" with partial selection) */
  indeterminate?: boolean;
  /** Disables the checkbox */
  disabled?: boolean;
  /** Prevents changes but keeps normal appearance */
  readonly?: boolean;
  /** Marks as required, shows asterisk on label */
  required?: boolean;
  /** Whether the checkbox is in an error state */
  error?: boolean;
  /** Checkbox size */
  size?: CoarCheckboxSize;
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
  /** Value submitted with form when checked */
  value?: string;
}

const props = withDefaults(defineProps<CoarCheckboxProps>(), {
  label: '',
  indeterminate: false,
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  size: 'm',
  id: '',
  name: '',
  value: '',
});

const model = defineModel<boolean>({ default: false });

const isFocused = ref(false);
const checkboxElement = useTemplateRef<HTMLInputElement>('checkboxElement');

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const autoId = `coar-checkbox-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || autoId);

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));

const hostClasses = computed(() => [
  'coar-checkbox-host',
  `coar-checkbox--${props.size}`,
  {
    'coar-checkbox--disabled': props.disabled,
    'coar-checkbox--readonly': props.readonly,
    'coar-checkbox--error': hasError.value,
  },
]);

const boxClasses = computed(() => [
  'coar-checkbox-box',
  {
    'coar-checkbox-checked': model.value === true,
    'coar-checkbox-indeterminate': props.indeterminate,
  },
]);

// Sync native indeterminate property
watch(
  [() => props.indeterminate, checkboxElement],
  ([ind, el]) => {
    if (el) el.indeterminate = ind;
  },
  { immediate: true },
);

function onChange(event: Event) {
  if (props.readonly) {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    target.checked = model.value === true;
    return;
  }
  const target = event.target as HTMLInputElement;
  model.value = target.checked;
}

function onFocus() {
  isFocused.value = true;
}

function onBlur() {
  isFocused.value = false;
}
</script>

<template>
  <div :class="hostClasses">
    <label class="coar-checkbox-wrapper" :class="{ 'coar-checkbox-focused': isFocused }">
      <!-- Hidden native checkbox -->
      <input
        :id="inputId"
        ref="checkboxElement"
        type="checkbox"
        class="coar-checkbox-input"
        :name="name || undefined"
        :value="value || undefined"
        :checked="model === true"
        :disabled="disabled"
        :required="required"
        :aria-describedby="formField?.messageId.value || undefined"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-readonly="readonly ? 'true' : undefined"
        :aria-checked="indeterminate ? 'mixed' : model === true"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"
      />

      <!-- Custom checkbox visual -->
      <span :class="boxClasses">
        <!-- Checkmark icon -->
        <svg class="coar-checkbox-icon coar-checkbox-icon-check" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 4.5L6.5 11.5L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <!-- Indeterminate icon (minus) -->
        <svg class="coar-checkbox-icon coar-checkbox-icon-indeterminate" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </span>

      <!-- Label text -->
      <span v-if="label" class="coar-checkbox-label">
        {{ label }}
        <span v-if="required" class="coar-checkbox-required">*</span>
      </span>
    </label>

  </div>
</template>

<style scoped>
.coar-checkbox-host {
  display: block;
}

/* Checkbox Wrapper */
.coar-checkbox-wrapper {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--coar-spacing-s);
  cursor: pointer;
  user-select: none;
  position: relative;
  min-height: var(--coar-component-m-height);
}

.coar-checkbox--xs .coar-checkbox-wrapper {
  min-height: var(--coar-component-xs-height);
  gap: var(--coar-spacing-xs);
}

.coar-checkbox--s .coar-checkbox-wrapper {
  min-height: var(--coar-component-s-height);
  gap: var(--coar-spacing-xs);
}

.coar-checkbox--l .coar-checkbox-wrapper {
  min-height: var(--coar-component-l-height);
  gap: var(--coar-spacing-s);
}

.coar-checkbox--disabled .coar-checkbox-wrapper {
  cursor: not-allowed;
}

/* Hidden native input */
.coar-checkbox-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Custom checkbox box */
.coar-checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 10px; /* Vertically centers box within component height — off the spacing grid */
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

/* Size variants */
.coar-checkbox--xs .coar-checkbox-box { width: 14px; height: 14px; margin-top: 6px; /* Vertical centering — off the spacing grid */ }
.coar-checkbox--s .coar-checkbox-box { width: 16px; height: 16px; margin-top: var(--coar-spacing-s); }
.coar-checkbox--l .coar-checkbox-box { width: 24px; height: 24px; margin-top: 12px; /* Vertical centering — off the spacing grid */ }

/* Hover state */
.coar-checkbox-wrapper:hover
  .coar-checkbox-box:not(.coar-checkbox-checked):not(.coar-checkbox-indeterminate) {
  border-color: var(--coar-border-input-hover);
}

.coar-checkbox--disabled .coar-checkbox-wrapper:hover .coar-checkbox-box {
  border-color: var(--coar-border-input);
}

/* Focus state */
.coar-checkbox-wrapper.coar-checkbox-focused .coar-checkbox-box {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

/* Checked state */
.coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

/* Checked hover */
.coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-accent-hover);
  border-color: var(--coar-background-accent-hover);
}

/* Checked active */
.coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-accent-active);
  border-color: var(--coar-background-accent-active);
}

/* Disabled state */
.coar-checkbox--disabled .coar-checkbox-box {
  background: var(--coar-surface-input-disabled);
  border-color: var(--coar-border-input);
  opacity: 0.6;
}

.coar-checkbox--disabled .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--disabled .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-background-neutral-tertiary);
}

.coar-checkbox--disabled .coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--disabled .coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-indeterminate,
.coar-checkbox--disabled .coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--disabled .coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-background-neutral-tertiary);
}

/* Readonly state */
.coar-checkbox--readonly .coar-checkbox-wrapper {
  cursor: default;
}

.coar-checkbox--readonly .coar-checkbox-wrapper:hover
  .coar-checkbox-box:not(.coar-checkbox-checked):not(.coar-checkbox-indeterminate) {
  border-color: var(--coar-border-input);
}

.coar-checkbox--readonly .coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--readonly .coar-checkbox-wrapper:hover .coar-checkbox-box.coar-checkbox-indeterminate,
.coar-checkbox--readonly .coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--readonly .coar-checkbox-wrapper:active .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

/* Error state */
.coar-checkbox--error .coar-checkbox-box {
  border-color: var(--coar-text-semantic-error-bold);
}

.coar-checkbox--error .coar-checkbox-box.coar-checkbox-checked,
.coar-checkbox--error .coar-checkbox-box.coar-checkbox-indeterminate {
  background: var(--coar-text-semantic-error-bold);
  border-color: var(--coar-text-semantic-error-bold);
}

/* Checkmark icon */
.coar-checkbox-icon {
  position: absolute;
  width: 14px;
  height: 14px;
  color: var(--coar-text-on-bold);
  opacity: 0;
  transition: opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-checkbox-box.coar-checkbox-checked:not(.coar-checkbox-indeterminate) .coar-checkbox-icon-check {
  opacity: 1;
}

.coar-checkbox-box.coar-checkbox-indeterminate .coar-checkbox-icon-indeterminate {
  opacity: 1;
}

.coar-checkbox--xs .coar-checkbox-icon { width: 10px; height: 10px; }
.coar-checkbox--s .coar-checkbox-icon { width: 11px; height: 11px; }
.coar-checkbox--l .coar-checkbox-icon { width: 16px; height: 16px; }

.coar-checkbox--disabled .coar-checkbox-icon {
  color: var(--coar-text-neutral-tertiary);
}

/* Label */
.coar-checkbox-label {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-component-m-font-size);
  font-weight: var(--coar-body-small-base-weight);
  line-height: var(--coar-component-m-height);
  color: var(--coar-text-neutral-primary);
}

.coar-checkbox--xs .coar-checkbox-label {
  font-size: var(--coar-component-xs-font-size);
  line-height: var(--coar-component-xs-height);
}

.coar-checkbox--s .coar-checkbox-label {
  font-size: var(--coar-component-s-font-size);
  line-height: var(--coar-component-s-height);
}

.coar-checkbox--l .coar-checkbox-label {
  font-size: var(--coar-component-l-font-size);
  line-height: var(--coar-component-l-height);
}

.coar-checkbox--disabled .coar-checkbox-label {
  color: var(--coar-text-neutral-disabled);
}

/* Required indicator */
.coar-checkbox-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-checkbox-box,
  .coar-checkbox-icon {
    transition: none;
  }
}
</style>
