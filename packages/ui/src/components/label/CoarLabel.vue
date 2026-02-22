<script setup lang="ts">
import { computed } from 'vue';

/**
 * Available sizes for the label component.
 * Matches the component size system used by buttons and inputs.
 */
export type CoarLabelSize = 'xs' | 's' | 'm' | 'l';

export interface CoarLabelProps {
  /** Size of the label. Should match the associated input/form element. */
  size?: CoarLabelSize;
  /** Whether to show a required indicator (*) after the label text. */
  required?: boolean;
  /** The ID of the form element this label is associated with. */
  for?: string;
  /** Label text. Alternative to using the default slot. */
  text?: string;
}

const props = withDefaults(defineProps<CoarLabelProps>(), {
  size: 'm',
  required: false,
  for: undefined,
  text: undefined,
});

const labelClasses = computed(() => [
  'coar-label',
  `coar-label--${props.size}`,
]);
</script>

<template>
  <label :class="labelClasses" :for="props.for">
    <template v-if="text">{{ text }}</template>
    <slot v-else />
    <span v-if="required" class="coar-label-required" aria-hidden="true">*</span>
  </label>
</template>

<style scoped>
/* ========================================
   COAR LABEL COMPONENT
   Standalone label for form elements
   Uses component size tokens for consistency

   NOTE: Labels are margin-free by default.
   Use parent container with gap for spacing.
   ======================================== */

.coar-label {
  display: block;
  font-family: var(--coar-body-small-bold-family);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

/* ========================================
   SIZES
   ======================================== */

.coar-label--xs {
  font-size: var(--coar-component-xs-label-font-size);
}

.coar-label--s {
  font-size: var(--coar-component-s-label-font-size);
}

.coar-label--m {
  font-size: var(--coar-component-m-label-font-size);
}

.coar-label--l {
  font-size: var(--coar-component-l-label-font-size);
}

/* ========================================
   REQUIRED INDICATOR
   ======================================== */

.coar-label-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}
</style>
