<script setup lang="ts">
import { computed, provide, inject } from 'vue';
import { RADIO_GROUP_INJECTION_KEY } from './constants';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type RadioGroupOrientation = 'horizontal' | 'vertical';
export type RadioGroupSize = 'xs' | 's' | 'm' | 'l';

export interface CoarRadioGroupProps {
  /** Group name for radio inputs */
  name: string;
  /** Accessible label for the group */
  label?: string;
  /** Layout orientation */
  orientation?: RadioGroupOrientation;
  /** Size of radio buttons */
  size?: RadioGroupSize;
  /** Label position relative to the radio control */
  labelPosition?: 'before' | 'after';
  /** Disables all radio buttons */
  disabled?: boolean;
  /** Marks the group as required */
  required?: boolean;
  /** Whether the group is in an error state */
  error?: boolean;
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
  labelPosition: 'after',
  disabled: false,
  required: false,
  error: false,
});

const model = defineModel<unknown>({ default: undefined });

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));

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
  labelPosition: computed(() => props.labelPosition),
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
    :aria-invalid="hasError ? 'true' : undefined"
    :aria-describedby="formField?.messageId.value || undefined"
  >
    <div class="coar-radio-group-items">
      <slot />
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

/* Disabled */
.coar-radio-group--disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
