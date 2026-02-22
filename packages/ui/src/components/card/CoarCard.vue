<script setup lang="ts">
import { computed, useSlots } from 'vue';

export type CardVariant = 'neutral' | 'outlined' | 'success' | 'warning' | 'error' | 'info' | 'accent';
export type CardPadding = 'none' | 's' | 'm' | 'l';

export interface CoarCardProps {
  /** Visual variant. */
  variant?: CardVariant;
  /** Internal padding size. */
  padding?: CardPadding;
  /** Whether to show elevation shadow. */
  elevated?: boolean;
  /** Whether to hide the border. */
  borderless?: boolean;
}

const props = withDefaults(defineProps<CoarCardProps>(), {
  variant: 'neutral',
  padding: 'm',
  elevated: false,
  borderless: false,
});

const slots = useSlots();

const hostClasses = computed(() => [
  'coar-card',
  `coar-card--${props.variant}`,
  `coar-card--padding-${props.padding}`,
  {
    'coar-card--elevated': props.elevated,
    'coar-card--borderless': props.borderless,
  },
]);
</script>

<template>
  <div :class="hostClasses">
    <div v-if="slots.header" class="coar-card__header">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="slots.footer" class="coar-card__footer">
      <slot name="footer" />
    </div>
    <div v-if="slots.inset" class="coar-card__inset">
      <slot name="inset" />
    </div>
  </div>
</template>

<style scoped>
.coar-card {
  display: block;
  border-radius: var(--coar-radius-s);
  border: 1px solid transparent;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Elevated */
.coar-card--elevated {
  box-shadow: var(--coar-elevation-medium);
}

/* Variants */
.coar-card--neutral {
  background-color: var(--coar-background-neutral-secondary);
  border-color: var(--coar-border-neutral-tertiary);
}

.coar-card--outlined {
  background-color: var(--coar-background-neutral-primary);
  border-color: var(--coar-color-gray-100);
}

.dark-mode .coar-card--outlined,
[data-theme='dark'] .coar-card--outlined {
  background-color: var(--coar-background-neutral-secondary);
  border-color: var(--coar-color-gray-200);
}

.coar-card--success {
  background-color: var(--coar-background-semantic-success-subtle);
  border-color: var(--coar-border-semantic-success-subtle);
}

.coar-card--warning {
  background-color: var(--coar-background-semantic-warning-subtle);
  border-color: var(--coar-border-semantic-warning-subtle);
}

.coar-card--error {
  background-color: var(--coar-background-semantic-error-subtle);
  border-color: var(--coar-border-semantic-error-subtle);
}

.coar-card--info {
  background-color: var(--coar-background-semantic-info-subtle);
  border-color: var(--coar-border-semantic-info-subtle);
}

.coar-card--accent {
  background-color: var(--coar-background-accent-secondary);
  border-color: var(--coar-border-accent-secondary);
}

/* Borderless */
.coar-card--borderless {
  border-color: transparent;
}

/* Padding */
.coar-card--padding-none { --coar-card-padding: 0px; padding: 0; }
.coar-card--padding-s    { --coar-card-padding: var(--coar-spacing-s); padding: var(--coar-spacing-s); }
.coar-card--padding-m    { --coar-card-padding: var(--coar-spacing-m); padding: var(--coar-spacing-m); }
.coar-card--padding-l    { --coar-card-padding: var(--coar-spacing-l); padding: var(--coar-spacing-l); }

/* Named sections */
.coar-card__header { margin-bottom: var(--coar-spacing-m); }
.coar-card__footer { margin-top: var(--coar-spacing-m); }
.coar-card__inset {
  margin-left: calc(-1 * var(--coar-card-padding));
  margin-right: calc(-1 * var(--coar-card-padding));
  margin-bottom: calc(-1 * var(--coar-card-padding));
}
</style>
