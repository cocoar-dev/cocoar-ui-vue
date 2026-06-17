<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
// Type-only import — erased at runtime, no bundling impact. See
// `CoarSidebarItem.vue` for the full soft-router-dep rationale.
import type { RouteLocationRaw } from 'vue-router';
import CoarIcon from '../icon/CoarIcon.vue';
import { useRouterLink } from '../_internal/use-router-link';

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
  /** Button type attribute (only applied when rendering as <button>). */
  type?: 'button' | 'submit' | 'reset';
  /** Icon name to display before the label */
  iconStart?: string;
  /** Icon name to display after the label */
  iconEnd?: string;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Optional aria-label for the underlying button */
  ariaLabel?: string;
  /**
   * Optional Vue Router target. Accepts anything `RouterLink.to` accepts
   * (string path, named-route object, etc.). When set the button renders as
   * an `<a href>` (via `RouterLink` if `vue-router` is installed, otherwise
   * a plain anchor) so middle-click / ctrl-click open a new tab, right-click
   * exposes "Open in new tab" / "Copy link address", and screenreaders
   * announce "link" instead of "button". `vue-router` is intentionally NOT a
   * peerDependency — apps without a router can still use buttons normally.
   *
   * `type` and the native `disabled` attribute are dropped on the link path
   * (invalid on `<a>`); disabled/loading state is enforced via
   * `aria-disabled`, `tabindex=-1`, and `pointer-events: none` from CSS.
   */
  to?: RouteLocationRaw | string;
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
  to: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const { t } = useI18n();

// Soft Vue Router integration — see use-router-link.ts.
const { RouterLink, hasRouterLink, warnIfMisconfigured } = useRouterLink();
watch(
  () => props.to,
  (to) => warnIfMisconfigured(to, 'CoarButton'),
  { immediate: true },
);
const hasTo = computed(() => props.to !== undefined && props.to !== null);

// We use RouterLink in NON-custom mode here (unlike Sidebar/Menu). The button
// has no `active` prop and no aria-current concerns, so we don't need slot
// access to `isActive` / `navigate`. RouterLink's internal click handler
// already runs guardEvent + push/replace for us, including modifier-click
// pass-through (Ctrl/Cmd/Middle → browser opens new tab natively).
const rootIs = computed(() => {
  if (hasTo.value) return hasRouterLink ? RouterLink : 'a';
  return 'button';
});

// Attribute set varies per render branch — `type` and `disabled` are valid
// only on `<button>`, `to` only on RouterLink, `href` only on plain `<a>`.
// Computing once keeps the template free of branching v-bind expressions.
const rootBindings = computed<Record<string, unknown>>(() => {
  if (hasTo.value) {
    return hasRouterLink ? { to: props.to } : { href: String(props.to) };
  }
  return {
    type: props.type,
    disabled: props.disabled || props.loading,
  };
});

const isLink = computed(() => hasTo.value);

const buttonClasses = computed(() => [
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
  // On the link branches, native <a disabled> is not a thing — we have to
  // intercept and preventDefault ourselves. The `@click.capture` binding in
  // the template guarantees this handler runs BEFORE RouterLink's internal
  // bubble-phase `onClick`, so `preventDefault` here makes RouterLink's
  // `guardEvent` bail out (it checks `defaultPrevented`). `stopPropagation`
  // also blocks bubble-phase delegation listeners further up the tree; we
  // intentionally do NOT use `stopImmediatePropagation`, which would also
  // kill capture-phase listeners on the same element (e.g. a `v-tooltip`
  // directive or a consumer-attached analytics handler) — overkill for the
  // intent here.
  if (props.disabled || props.loading) {
    if (isLink.value) {
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }
  emit('click', event);
}
</script>

<template>
  <component
    :is="rootIs"
    :class="buttonClasses"
    v-bind="rootBindings"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
    :tabindex="isLink && (disabled || loading) ? -1 : undefined"
    @click.capture="handleClick"
  >
    <!-- Screen reader loading announcement -->
    <span
      v-if="loading"
      class="coar-button__sr-status"
      role="status"
      aria-live="polite"
    >{{ t('coar.ui.button.loading', undefined, 'Loading') }}</span>

    <!-- Loading Spinner: Centered overlay when no icons -->
    <span
      v-if="loading && !iconStart && !iconEnd"
      class="coar-button__spinner coar-button__spinner--overlay"
      aria-hidden="true"
    >
      <CoarIcon name="loader-circle" spin size="auto" />
    </span>

    <!-- Icon Start: Show spinner instead when loading -->
    <span
      v-if="loading && iconStart"
      class="coar-button__spinner coar-button__spinner--inline"
      aria-hidden="true"
    >
      <CoarIcon name="loader-circle" spin size="auto" />
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
      <CoarIcon name="loader-circle" spin size="auto" />
    </span>
    <span
      v-else-if="iconEnd"
      class="coar-button__icon coar-button__icon--end"
      aria-hidden="true"
    >
      <CoarIcon :name="iconEnd" size="auto" />
    </span>
  </component>
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
  border-radius: var(--coar-button-radius);
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
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: var(--coar-focus-offset);
}

/* ========================================
   SIZES
   ======================================== */

.coar-button--xs {
  height: var(--coar-component-xs-height);
  padding: 0 calc(10px * var(--coar-component-density, 1));
  font-size: var(--coar-component-xs-font-size);
  gap: 0.375rem;
}

.coar-button--s {
  height: var(--coar-component-s-height);
  padding: 0 calc(12px * var(--coar-component-density, 1));
  font-size: var(--coar-component-s-font-size);
  gap: 0.375rem;
}

.coar-button--m {
  height: var(--coar-component-m-height);
  padding: 0 calc(var(--coar-spacing-m) * var(--coar-component-density, 1));
  font-size: var(--coar-component-m-font-size);
}

.coar-button--l {
  height: var(--coar-component-l-height);
  padding: 0 calc(var(--coar-spacing-l) * var(--coar-component-density, 1));
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
  background: var(--coar-button-danger-bg);
  color: var(--coar-text-on-bold);
}

.coar-button--danger:hover:not(:disabled) {
  background: var(--coar-button-danger-bg-hover);
}

.coar-button--danger:active:not(:disabled) {
  background: var(--coar-button-danger-bg-active);
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

/*
 * Hide the empty content span entirely in icon-only mode. Without
 * this, the empty span still counts as a flex item — the parent
 * `gap` between icon and content shifts the icon left by `gap/2`,
 * leaving the icon visually off-center inside an aspect-1 button.
 * `:empty` only matches when the slot rendered nothing, so this
 * doesn't affect buttons with text content.
 */
.coar-button .coar-button__content:empty {
  display: none;
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
  line-height: var(--coar-line-height-none);
  flex-shrink: 0;
}

.coar-button__icon--start {
  margin-left: -0.125rem;
}

.coar-button__icon--end {
  margin-right: -0.125rem;
}

/* Screen reader status */
.coar-button__sr-status {
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
  line-height: var(--coar-line-height-none);
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
