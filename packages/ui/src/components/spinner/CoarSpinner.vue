<script setup lang="ts">
import { computed } from 'vue';

export type CoarSpinnerSize = 'xs' | 's' | 'm' | 'l';

export interface CoarSpinnerProps {
  /** Spinner size. */
  size?: CoarSpinnerSize;
  /** Accessible label for screen readers. */
  label?: string;
}

const props = withDefaults(defineProps<CoarSpinnerProps>(), {
  size: 'm',
  label: 'Loading',
});

const hostClasses = computed(() => [
  'coar-spinner',
  `coar-spinner--${props.size}`,
]);
</script>

<template>
  <span :class="hostClasses" role="status" :aria-label="props.label">
    <svg
      class="coar-spinner-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle class="coar-spinner-bg" cx="12" cy="12" r="10" stroke-width="3" />
      <circle
        class="coar-spinner-arc"
        cx="12"
        cy="12"
        r="10"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.coar-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Size variants */
.coar-spinner--xs { --coar-spinner-size: 16px; }
.coar-spinner--s  { --coar-spinner-size: 20px; }
.coar-spinner--m  { --coar-spinner-size: 24px; }
.coar-spinner--l  { --coar-spinner-size: 32px; }

.coar-spinner-svg {
  width: var(--coar-spinner-size);
  height: var(--coar-spinner-size);
  animation: coar-spinner-rotate 0.8s linear infinite;
}

.coar-spinner-bg {
  stroke: var(--coar-background-neutral-tertiary);
  fill: none;
}

.coar-spinner-arc {
  stroke: var(--coar-background-accent-primary);
  fill: none;
  stroke-dasharray: 44 19;
  stroke-dashoffset: 0;
}

@keyframes coar-spinner-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .coar-spinner-svg {
    animation: none;
  }

  .coar-spinner-arc {
    stroke-dasharray: none;
    opacity: 0.6;
  }
}
</style>
