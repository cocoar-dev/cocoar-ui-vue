<script setup lang="ts">
import { computed } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 's' | 'm' | 'l';

export interface CoarButtonProps {
  /** Button visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Icon name to display before the label */
  iconStart?: string;
  /** Icon name to display after the label */
  iconEnd?: string;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Optional aria-label for the underlying button */
  ariaLabel?: string;
}

const props = withDefaults(defineProps<CoarButtonProps>(), {
  variant: 'primary',
  size: 'm',
  disabled: false,
  loading: false,
  type: 'button',
  iconStart: undefined,
  iconEnd: undefined,
  fullWidth: false,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses= computed(() => [
  'coar-button',
  `coar-button--${props.variant}`,
  `coar-button--${props.size}`,
  {
    'coar-button--loading': props.loading,
    'coar-button--loading-overlay': props.loading && !props.iconStart && !props.iconEnd,
    'coar-button--disabled': props.disabled,
    'coar-button--full-width': props.fullWidth,
  },
]);

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
}
</script>

<template>
  <button
    :class="buttonClasses"
    :type="type"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <!-- Loading Spinner: Centered overlay when no icons -->
    <span
      v-if="loading && !iconStart && !iconEnd"
      class="coar-button__spinner coar-button__spinner--overlay"
      aria-hidden="true"
    >
      <CoarIcon name="load" spin size="auto" />
    </span>

    <!-- Icon Start: Show spinner instead when loading -->
    <span
      v-if="loading && iconStart"
      class="coar-button__spinner coar-button__spinner--inline"
      aria-hidden="true"
    >
      <CoarIcon name="load" spin size="auto" />
    </span>
    <span
      v-else-if="iconStart"
      class="coar-button__icon coar-button__icon--start"
      aria-hidden="true"
    >
      <CoarIcon :name="iconStart" size="auto" />
    </span>

    <!-- Content -->
    <span class="coar-button__content">
      <slot />
    </span>

    <!-- Icon End: Show spinner instead when loading (only if no iconStart) -->
    <span
      v-if="loading && !iconStart && iconEnd"
      class="coar-button__spinner coar-button__spinner--inline"
      aria-hidden="true"
    >
      <CoarIcon name="load" spin size="auto" />
    </span>
    <span
      v-else-if="iconEnd"
      class="coar-button__icon coar-button__icon--end"
      aria-hidden="true"
    >
      <CoarIcon :name="iconEnd" size="auto" />
    </span>
  </button>
</template>

<style scoped>
/* ========================================
   COAR BUTTON COMPONENT
   ======================================== */

.coar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--coar-spacing-s);
  border: none;
  border-radius: var(--coar-radius-xs);
  font-family: var(--coar-body-base-family);
  font-weight: var(--coar-body-base-weight);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
  white-space: nowrap;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.coar-button:focus-visible {
  outline: 2px solid var(--coar-border-accent-primary);
  outline-offset: 2px;
}

/* ========================================
   SIZES
   ======================================== */

.coar-button--xs {
  height: var(--coar-component-xs-height);
  padding: 0 10px; /* 10px is off the spacing grid — between s(8px) and m(16px) */
  font-size: var(--coar-component-xs-font-size);
  gap: 0.375rem;
}

.coar-button--s {
  height: var(--coar-component-s-height);
  padding: 0 12px; /* 12px is off the spacing grid — between s(8px) and m(16px) */
  font-size: var(--coar-component-s-font-size);
  gap: 0.375rem;
}

.coar-button--m {
  height: var(--coar-component-m-height);
  padding: 0 var(--coar-spacing-m);
  font-size: var(--coar-component-m-font-size);
}

.coar-button--l {
  height: var(--coar-component-l-height);
  padding: 0 var(--coar-spacing-l);
  font-size: var(--coar-component-l-font-size);
  gap: 0.625rem;
}

/* ========================================
   VARIANTS
   ======================================== */

/* Primary */
.coar-button--primary {
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
}

.coar-button--primary:hover:not(:disabled) {
  background: var(--coar-background-accent-hover);
}

.coar-button--primary:active:not(:disabled) {
  background: var(--coar-background-accent-active);
}

/* Secondary */
.coar-button--secondary {
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-secondary);
}

.coar-button--secondary:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

.coar-button--secondary:active:not(:disabled) {
  background: var(--coar-background-neutral-active);
}

/* Tertiary - Soft accent style */
.coar-button--tertiary {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

.coar-button--tertiary:hover:not(:disabled) {
  background: var(--coar-background-accent-secondary);
}

.coar-button--tertiary:active:not(:disabled) {
  background: var(--coar-background-accent-tertiary-active);
}

/* Danger */
.coar-button--danger {
  background: var(--coar-background-semantic-error-bold);
  color: var(--coar-text-on-bold);
}

.coar-button--danger:hover:not(:disabled) {
  background: var(--coar-background-semantic-error-hover);
}

.coar-button--danger:active:not(:disabled) {
  background: var(--coar-background-semantic-error-active);
}

/* Ghost */
.coar-button--ghost {
  background: transparent;
  color: var(--coar-text-neutral-primary);
}

.coar-button--ghost:hover:not(:disabled) {
  background: var(--coar-background-neutral-secondary);
}

.coar-button--ghost:active:not(:disabled) {
  background: var(--coar-background-neutral-tertiary);
}

/* ========================================
   STATES
   ======================================== */

.coar-button--disabled,
.coar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.coar-button--loading {
  cursor: wait;
  pointer-events: none;
  user-select: none;
}

.coar-button--loading-overlay .coar-button__content {
  opacity: 0;
}

.coar-button--full-width {
  width: 100%;
}

/* ========================================
   ICON-ONLY MODE (auto-detected)
   ======================================== */

.coar-button:has(.coar-button__icon, .coar-button__spinner--inline):has(
    .coar-button__content:empty
  ) {
  padding: 0;
  aspect-ratio: 1;
}

.coar-button:has(.coar-button__icon, .coar-button__spinner--inline):has(.coar-button__content:empty)
  .coar-button__icon {
  margin: 0;
}

.coar-button:has(.coar-button__icon, .coar-button__spinner--inline):has(.coar-button__content:empty)
  .coar-button__spinner--inline {
  margin: 0;
}

/* ========================================
   INNER ELEMENTS
   ======================================== */

.coar-button__content {
  display: inline-flex;
  align-items: center;
  gap: inherit;
}

.coar-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  font-size: 1.125em;
  line-height: 1;
  flex-shrink: 0;
}

.coar-button__icon--start {
  margin-left: -0.125rem;
}

.coar-button__icon--end {
  margin-right: -0.125rem;
}

/* Spinner */
.coar-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.coar-button__spinner--overlay {
  position: absolute;
}

.coar-button__spinner--inline {
  width: 1.25em;
  height: 1.25em;
  font-size: 1.125em;
  line-height: 1;
  flex-shrink: 0;
}

.coar-button__spinner--inline:first-child {
  margin-left: -0.125rem;
}

.coar-button__spinner--inline:last-of-type {
  margin-right: -0.125rem;
}

/* ========================================
   REDUCED MOTION
   ======================================== */

@media (prefers-reduced-motion: reduce) {
  .coar-button {
    transition: none;
  }
}
</style>
