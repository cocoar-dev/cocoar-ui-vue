<script setup lang="ts">
import { computed } from 'vue';

export type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'error';
export type ProgressBarSize = 's' | 'm' | 'l';

export interface CoarProgressBarProps {
  /** Current progress value (0 to max). */
  value?: number;
  /** Maximum progress value. */
  max?: number;
  /** Visual variant. */
  variant?: ProgressBarVariant;
  /** Bar height size. */
  size?: ProgressBarSize;
  /** Whether to show an indeterminate animation. */
  indeterminate?: boolean;
  /** Accessible label for the progress bar. */
  label?: string;
  /** Whether to display the percentage text. */
  showValue?: boolean;
}

const props = withDefaults(defineProps<CoarProgressBarProps>(), {
  value: 0,
  max: 100,
  variant: 'accent',
  size: 'm',
  indeterminate: false,
  label: '',
  showValue: false,
});

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (props.value / props.max) * 100)));
});

const hostClasses = computed(() => [
  'coar-progress-bar',
  `coar-progress-bar--${props.size}`,
  `coar-progress-bar--${props.variant}`,
  { 'coar-progress-bar--indeterminate': props.indeterminate },
]);

const fillWidth = computed(() =>
  props.indeterminate ? '100%' : `${percentage.value}%`,
);
</script>

<template>
  <div
    :class="hostClasses"
    role="progressbar"
    :aria-valuenow="indeterminate ? undefined : percentage"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-label="label || undefined"
  >
    <div class="coar-progress-bar-container">
      <div class="coar-progress-bar-fill" :style="{ width: fillWidth }"></div>
    </div>
    <span v-if="showValue && !indeterminate" class="coar-progress-bar-value">
      {{ percentage }}%
    </span>
  </div>
</template>

<style scoped>
.coar-progress-bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  width: 100%;
}

/* Size variants */
.coar-progress-bar--s { --coar-progress-bar-height: var(--coar-progress-bar-s-height); }
.coar-progress-bar--m { --coar-progress-bar-height: var(--coar-progress-bar-m-height); }
.coar-progress-bar--l { --coar-progress-bar-height: var(--coar-progress-bar-l-height); }

/* Variant colors */
.coar-progress-bar--accent  { --coar-progress-bar-fill-color: var(--coar-background-accent-primary); }
.coar-progress-bar--success { --coar-progress-bar-fill-color: var(--coar-background-semantic-success-bold); }
.coar-progress-bar--warning { --coar-progress-bar-fill-color: var(--coar-background-semantic-warning-bold); }
.coar-progress-bar--error   { --coar-progress-bar-fill-color: var(--coar-background-semantic-error-bold); }

/* Container */
.coar-progress-bar-container {
  flex: 1;
  height: var(--coar-progress-bar-height);
  border-radius: var(--coar-progress-bar-radius);
  background: var(--coar-progress-bar-background);
  overflow: hidden;
}

/* Fill */
.coar-progress-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--coar-progress-bar-fill-color);
  transition: width var(--coar-duration-fast) ease;
}

/* Indeterminate animation */
.coar-progress-bar--indeterminate .coar-progress-bar-fill {
  width: 30% !important;
  animation: coar-progress-bar-indeterminate 1.5s ease-in-out infinite;
}

@keyframes coar-progress-bar-indeterminate {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(200%); }
  100% { transform: translateX(-100%); }
}

/* Percentage text */
.coar-progress-bar-value {
  flex-shrink: 0;
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  color: var(--coar-text-neutral-secondary);
  min-width: 2.5em;
  text-align: right;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-progress-bar-fill {
    transition: none;
  }

  .coar-progress-bar--indeterminate .coar-progress-bar-fill {
    animation: none;
    width: 100% !important;
    opacity: 0.6;
  }
}
</style>
