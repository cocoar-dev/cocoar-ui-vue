<script setup lang="ts">
import { computed, provide, useId } from 'vue';
import { FORM_FIELD_INJECTION_KEY } from './constants';

export interface CoarFormFieldProps {
  /** Visible label text */
  label?: string;
  /** Error message — triggers error state on child inputs */
  error?: string;
  /** Hint text shown below the input (error takes priority) */
  hint?: string;
  /** Show required indicator (*) next to label */
  required?: boolean;
  /** Disabled state — propagated to child inputs */
  disabled?: boolean;
  /** Explicit input ID (auto-generated if omitted) */
  id?: string;
}

const props = withDefaults(defineProps<CoarFormFieldProps>(), {
  label: undefined,
  error: '',
  hint: '',
  required: false,
  disabled: false,
  id: undefined,
});

const autoId = `coar-field-${useId()}`;
const inputId = computed(() => props.id || autoId);
const labelId = computed(() => `${inputId.value}-label`);
const messageId = computed(() => `${inputId.value}-message`);
const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);

provide(FORM_FIELD_INJECTION_KEY, {
  inputId,
  messageId,
  hasError,
  disabled: computed(() => props.disabled),
});
</script>

<template>
  <div class="coar-form-field" :class="{ 'coar-form-field--disabled': disabled }">
    <label v-if="label" :id="labelId" :for="inputId" class="coar-form-field__label">
      {{ label }}
      <span v-if="required" class="coar-form-field__required" aria-hidden="true">*</span>
    </label>

    <slot />

    <div
      v-if="displayMessage"
      :id="messageId"
      class="coar-form-field__message"
      :class="{ 'coar-form-field__message--error': hasError }"
      :title="displayMessage"
    >
      {{ displayMessage }}
    </div>
  </div>
</template>

<style scoped>
.coar-form-field {
  display: block;
}

.coar-form-field--disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* Label */
.coar-form-field__label {
  display: block;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-form-field__required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

/* Message (hint/error) */
.coar-form-field__message {
  display: block;
  margin-top: var(--coar-spacing-xs);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  line-height: 1.4;
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-form-field__message--error {
  color: var(--coar-text-semantic-error-bold);
}
</style>
