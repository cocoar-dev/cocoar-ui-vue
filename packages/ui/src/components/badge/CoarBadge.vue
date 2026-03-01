<script setup lang="ts">
import { computed } from 'vue';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface CoarBadgeProps {
  /** Content to display (number, text, or icon). */
  content?: string | number;
  /** Badge visual variant. */
  variant?: BadgeVariant;
  /** Badge size. */
  size?: BadgeSize;
  /** Whether the badge should pulse/animate. */
  pulse?: boolean;
  /** Whether to show as a dot without content. */
  dot?: boolean;
  /**
   * Maximum number to display (shows "99+" if exceeded).
   * Only applies when `content` is a number.
   */
  max?: number | null;
  /** Whether to show a border around the badge. */
  bordered?: boolean;
}

const props = withDefaults(defineProps<CoarBadgeProps>(), {
  content: '',
  variant: 'primary',
  size: 'm',
  pulse: false,
  dot: false,
  max: null,
  bordered: false,
});

const displayValue = computed(() => {
  if (props.dot) return '';

  const content = props.content;
  const max = props.max;

  if (typeof content === 'number' && max !== null && content > max) {
    return `${max}+`;
  }

  return String(content);
});

const hostClasses = computed(() => [
  'coar-badge-host',
  {
    'coar-badge-host--pulse': props.pulse,
  },
]);

const badgeClasses = computed(() => [
  'coar-badge',
  `coar-badge--${props.variant}`,
  `coar-badge--${props.size}`,
  {
    'coar-badge--dot': props.dot,
    'coar-badge--bordered': props.bordered,
  },
]);
</script>

<template>
  <span :class="hostClasses">
    <span :class="badgeClasses" role="status" :aria-label="displayValue || variant">
      <span v-if="!dot && displayValue" class="coar-badge__content">{{ displayValue }}</span>
    </span>
  </span>
</template>

<style scoped>
.coar-badge-host {
  display: inline-flex;
  vertical-align: middle;
}

.coar-badge-host--pulse {
  animation: coar-badge-pulse 1.5s ease-in-out infinite;
}

.coar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--coar-radius-full);
  font-family: var(--coar-body-small-bold-family);
  font-weight: var(--coar-body-small-bold-weight);
  white-space: nowrap;
  user-select: none;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
  line-height: 1;
}

.coar-badge__content {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Sizes */
.coar-badge--xs {
  min-width: 12px;
  height: 12px;
  padding: 0 2px;
  font-size: 8px;
}
.coar-badge--s {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
}
.coar-badge--m {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
.coar-badge--l {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}
.coar-badge--xl {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  font-size: 14px;
}
/* Variants */
.coar-badge--primary {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
}
.coar-badge--secondary {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}
.coar-badge--success {
  background: var(--coar-background-semantic-success-bold);
  color: var(--coar-text-on-bold);
}
.coar-badge--warning {
  background: var(--coar-background-semantic-warning-bold);
  color: var(--coar-text-on-bold);
}
.coar-badge--error {
  background: var(--coar-background-semantic-error-bold);
  color: var(--coar-text-on-bold);
}
.coar-badge--info {
  background: var(--coar-background-semantic-info-bold);
  color: var(--coar-text-on-bold);
}

/* Dot mode */
.coar-badge--dot {
  padding: 0;
}
.coar-badge--dot.coar-badge--xs {
  min-width: 4px;
  width: 4px;
  height: 4px;
}
.coar-badge--dot.coar-badge--s {
  min-width: 6px;
  width: 6px;
  height: 6px;
}
.coar-badge--dot.coar-badge--m {
  min-width: 8px;
  width: 8px;
  height: 8px;
}
.coar-badge--dot.coar-badge--l {
  min-width: 10px;
  width: 10px;
  height: 10px;
}
.coar-badge--dot.coar-badge--xl {
  min-width: 12px;
  width: 12px;
  height: 12px;
}

/* Bordered */
.coar-badge--bordered {
  box-shadow: 0 0 0 2px var(--coar-background-neutral-primary);
}

/* Pulse animation */
@keyframes coar-badge-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .coar-badge-host--pulse {
    animation: none;
  }
}
</style>
