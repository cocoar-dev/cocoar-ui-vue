<script setup lang="ts">
import { computed, provide } from 'vue';
import { RADIO_GROUP_INJECTION_KEY } from './constants';

export type RadioGroupOrientation = 'horizontal' | 'vertical';
export type RadioGroupSize = 's' | 'm' | 'l';

export interface CoarRadioGroupProps {
  /** Group name for radio inputs */
  name: string;
  /** Accessible label for the group */
  label?: string;
  /** Layout orientation */
  orientation?: RadioGroupOrientation;
  /** Size of radio buttons */
  size?: RadioGroupSize;
  /** Disables all radio buttons */
  disabled?: boolean;
  /** Marks the group as required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
}

export interface RadioGroupContext {
  name: string;
  size: RadioGroupSize;
  disabled: boolean;
  hasError: boolean;
  modelValue: unknown;
  selectValue: (value: unknown) => void;
}

const props = withDefaults(defineProps<CoarRadioGroupProps>(), {
  label: '',
  orientation: 'vertical',
  size: 'm',
  disabled: false,
  required: false,
  error: '',
  hint: '',
});

const model = defineModel<unknown>({ default: undefined });

const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);

const autoId = `coar-radio-group-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const messageId = computed(() => `${autoId}-message`);

const hostClasses = computed(() => [
  'coar-radio-group-host',
  `coar-radio-group--${props.orientation}`,
  `coar-radio-group--${props.size}`,
  {
    'coar-radio-group--disabled': props.disabled,
    'coar-radio-group--error': hasError.value,
  },
]);

function selectValue(value: unknown) {
  if (props.disabled) return;
  model.value = value;
}

// Provide individual refs to child CoarRadioButton components
// so that each child only re-renders when the specific property it uses changes
provide(RADIO_GROUP_INJECTION_KEY, {
  name: computed(() => props.name),
  size: computed(() => props.size),
  disabled: computed(() => props.disabled),
  hasError,
  modelValue: computed(() => model.value),
  selectValue,
});
</script>

<template>
  <div
    :class="hostClasses"
    role="radiogroup"
    :aria-label="label || undefined"
    :aria-required="required ? 'true' : undefined"
    :aria-describedby="displayMessage ? messageId : undefined"
  >
    <div class="coar-radio-group-items">
      <slot />
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
</template>

<style scoped>
.coar-radio-group-host {
  display: block;
}

.coar-radio-group-items {
  display: flex;
  flex-wrap: wrap;
}

/* Orientations */
.coar-radio-group--vertical .coar-radio-group-items {
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.coar-radio-group--horizontal .coar-radio-group-items {
  flex-direction: row;
  gap: var(--coar-spacing-xl);
}

/* Message styles are in shared/form-field-message.css */

/* Disabled */
.coar-radio-group--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
