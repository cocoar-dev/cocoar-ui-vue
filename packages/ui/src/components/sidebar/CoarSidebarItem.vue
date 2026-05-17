<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
// Type-only import — erased at runtime, no bundling impact, no hard
// `vue-router` dependency. Apps without a router still type-check fine
// because `RouteLocationRaw` resolves to `string | RouteLocationAsPath
// | RouteLocationAsRelative | RouteLocationAsString` — all structural
// shapes a consumer might want to pass.
import type { RouteLocationRaw } from 'vue-router';
import CoarIcon from '../icon/CoarIcon.vue';
import type { CoarIconSize } from '../icon/icon-service';
import { useRouterLink } from '../_internal/use-router-link';
import { vTooltip } from '../tooltip/vTooltip';
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_ICON_SIZE_KEY,
  SIDEBAR_FLYOUT_ICON_ONLY_KEY,
  SIDEBAR_SIDE_KEY,
  orientationOf,
  type SidebarSide,
} from './sidebar-context';

const props = withDefaults(
  defineProps<{
    /** Item label text */
    label: string;
    /** Icon name (required for collapsed mode) */
    icon?: string;
    /**
     * Optional Vue Router target. Accepts anything `RouterLink.to` accepts
     * (string path, named-route object, etc.). When set the item renders as a
     * real `<a href>` so:
     *  - middle-click + ctrl/cmd-click open in a new tab (browser default)
     *  - right-click shows "Open in new tab" / "Copy link address"
     *  - screenreaders announce "link" instead of "menuitem"
     * Routing is delegated to `RouterLink` when `vue-router` is installed and
     * its plugin registered globally; otherwise we degrade to a plain anchor
     * that uses the browser's native navigation (works for absolute URLs).
     * `vue-router` is an optional `peerDependenciesMeta` entry — apps without
     * a router still use this component for click-emit items (logout, toggles).
     *
     * A11y note: the `<a>` branch intentionally drops `role="menuitem"`. The
     * surrounding `<CoarSidebar>` is `role="navigation"`, where a native link
     * is semantically complete on its own — adding `role="menuitem"` would
     * require a `role="menu"` parent per WAI-ARIA and would mislead AT
     * announcements. The legacy `<div>` branch (no `to`) keeps the role for
     * back-compat with the original API.
     */
    to?: RouteLocationRaw | string;
    /**
     * Whether this item is currently active (e.g. current route).
     * If `to` is set and `active` is left undefined, the active state is
     * inferred from `RouterLink`'s `isActive`. Setting `active` explicitly
     * always wins (use for non-route active states, e.g. drawer-open).
     */
    active?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  { icon: undefined, to: undefined, active: undefined, disabled: false },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
const sidebarIconSize = inject(SIDEBAR_ICON_SIZE_KEY, ref<CoarIconSize>('m'));
const sidebarSide = inject(SIDEBAR_SIDE_KEY, ref<SidebarSide>('left'));
const isIconOnly = inject(SIDEBAR_FLYOUT_ICON_ONLY_KEY, ref(false));

// Soft Vue Router integration via shared helper (see use-router-link.ts).
// Centralises the resolveDynamicComponent pattern AND the DEV warning for
// non-string `to` without a router.
const { RouterLink, hasRouterLink, warnIfMisconfigured } = useRouterLink();
watch(
  () => props.to,
  (to) => warnIfMisconfigured(to, 'CoarSidebarItem'),
  { immediate: true },
);

const tooltipPlacement = computed<'left' | 'right' | 'top' | 'bottom'>(() => {
  switch (sidebarSide.value) {
    case 'right': return 'left';
    case 'top': return 'bottom';
    case 'bottom': return 'top';
    default: return 'right';
  }
});

const tooltipConfig = computed(() => {
  if (isIconOnly.value) return { content: props.label, placement: tooltipPlacement.value, openDelay: 100 };
  if (!sidebarCollapsed.value) return false;
  return { content: props.label, placement: tooltipPlacement.value, openDelay: 200 };
});

const orientation = computed(() => orientationOf(sidebarSide.value));

const hasTo = computed(() => props.to !== undefined && props.to !== null);

function classesFor(isRouterActive: boolean): unknown[] {
  const isActive = props.active ?? isRouterActive;
  return [
    `coar-sidebar-item--side-${sidebarSide.value}`,
    `coar-sidebar-item--${orientation.value}`,
    {
      'coar-sidebar-item--active': isActive,
      'coar-sidebar-item--disabled': props.disabled,
      'coar-sidebar-item--collapsed': sidebarCollapsed.value,
    },
  ];
}

function ariaCurrentFor(isRouterActive: boolean): 'page' | undefined {
  const isActive = props.active ?? isRouterActive;
  return isActive ? 'page' : undefined;
}

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  emit('click', event);
}

// For anchor variants: when disabled, prevent navigation entirely. Otherwise
// emit `click` for consumer side-effects (telemetry, drawer-toggle on small
// screens, etc.), then hand off to RouterLink's `navigate`.
//
// `navigate` is RouterLink's slot-exposed function. It runs an internal
// `guardEvent` check that no-ops on modifier-clicks (Ctrl/Cmd/Shift/Alt or
// non-left button) and on already-preventDefaulted events, then calls
// preventDefault + router.push. We must NOT call preventDefault ourselves
// before navigate or guardEvent bails out and SPA routing breaks.
function handleAnchorClick(
  event: MouseEvent,
  navigate?: (e?: MouseEvent) => Promise<unknown>,
) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
  if (navigate) {
    void navigate(event);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (props.disabled) return;
  event.preventDefault();
  emit('click', new MouseEvent('click'));
}
</script>

<template>
  <!-- `to` + vue-router available: use RouterLink in custom mode so we render
       the <a> ourselves and keep full control of class/aria/tooltip/icon. -->
  <component
    :is="RouterLink"
    v-if="hasTo && hasRouterLink"
    :to="to"
    custom
  >
    <template #default="{ href, isActive, navigate }">
      <a
        v-tooltip="tooltipConfig"
        :href="href"
        class="coar-sidebar-item"
        :class="classesFor(isActive)"
        :aria-disabled="props.disabled || undefined"
        :aria-current="ariaCurrentFor(isActive)"
        :tabindex="props.disabled ? -1 : undefined"
        @click="(e) => handleAnchorClick(e, navigate)"
      >
        <span class="coar-sidebar-item__icon" aria-hidden="true">
          <CoarIcon :name="props.icon || 'square-dashed'" :size="sidebarIconSize" />
        </span>
        <span class="coar-sidebar-item__label">
          {{ props.label }}
        </span>
      </a>
    </template>
  </component>

  <!-- `to` set but no router installed: plain <a href>. Works for absolute
       URLs and degrades reasonably for relative paths (full page reload). -->
  <a
    v-else-if="hasTo"
    v-tooltip="tooltipConfig"
    :href="String(to)"
    class="coar-sidebar-item"
    :class="classesFor(false)"
    :aria-disabled="props.disabled || undefined"
    :aria-current="ariaCurrentFor(false)"
    :tabindex="props.disabled ? -1 : undefined"
    @click="handleAnchorClick"
  >
    <span class="coar-sidebar-item__icon" aria-hidden="true">
      <CoarIcon :name="props.icon || 'square-dashed'" :size="sidebarIconSize" />
    </span>
    <span class="coar-sidebar-item__label">
      {{ props.label }}
    </span>
  </a>

  <!-- No `to`: original <div role="menuitem"> path for action items
       (logout, collapse-toggle, custom @click handlers). Behaviour pinned
       to the pre-`to`-prop version — emits `click` on Enter/Space too. -->
  <div
    v-else
    v-tooltip="tooltipConfig"
    role="menuitem"
    class="coar-sidebar-item"
    :class="classesFor(false)"
    :aria-disabled="props.disabled || undefined"
    :aria-current="ariaCurrentFor(false)"
    :tabindex="props.disabled ? -1 : 0"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="coar-sidebar-item__icon" aria-hidden="true">
      <CoarIcon :name="props.icon || 'square-dashed'" :size="sidebarIconSize" />
    </span>
    <span class="coar-sidebar-item__label">
      {{ props.label }}
    </span>
  </div>
</template>

<style scoped>
.coar-sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--coar-sidebar-item-gap, 0.75rem);
  box-sizing: border-box;
  padding: var(--coar-sidebar-item-padding, 0.5rem 0.75rem);
  margin: var(--coar-sidebar-item-margin, 2px 0);
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-component-m-font-size);
  font-weight: var(--coar-font-weight-regular);
  line-height: var(--coar-line-height-relaxed);
  color: var(--coar-text-neutral-secondary);
  background: transparent;
  border-radius: var(--coar-sidebar-item-radius, var(--coar-radius-xxs));
  cursor: pointer;
  user-select: none;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
  /* Reset native <a> defaults so the link variant looks identical to <div>. */
  text-decoration: none;
}

/* In horizontal sidebars, items default to a more compact, in-row footprint.
   `flex-shrink: 0` keeps each item at its content width so the row overflows
   when there isn't enough space — that overflow is what makes the
   OverlayScrollbars horizontal scrollbar appear. Without this, flex's default
   shrinking would squish items to fit and no scroll would ever trigger. */
.coar-sidebar-item--horizontal {
  margin: var(--coar-sidebar-item-margin-horizontal, 0 2px);
  flex-shrink: 0;
}

.coar-sidebar-item:hover:not(.coar-sidebar-item--disabled) {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
}

.coar-sidebar-item:focus-visible {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

/* Active state — indicator border lives on the same edge as the sidebar side. */
.coar-sidebar-item--active {
  color: var(--coar-sidebar-item-active-color, var(--coar-text-accent-primary));
  background: var(--coar-sidebar-item-active-bg, var(--coar-background-accent-tertiary));
  font-weight: var(--coar-font-weight-medium);
}

.coar-sidebar-item--active.coar-sidebar-item--side-left {
  border-left: 3px solid currentColor;
  padding-left: calc(0.75rem - 3px);
}

.coar-sidebar-item--active.coar-sidebar-item--side-right {
  border-right: 3px solid currentColor;
  padding-right: calc(0.75rem - 3px);
}

.coar-sidebar-item--active.coar-sidebar-item--side-top {
  border-top: 3px solid currentColor;
  padding-top: calc(0.5rem - 3px);
}

.coar-sidebar-item--active.coar-sidebar-item--side-bottom {
  border-bottom: 3px solid currentColor;
  padding-bottom: calc(0.5rem - 3px);
}

/* Collapsed (icon-only) drops the indicator border and re-pads symmetrically. */
.coar-sidebar-item--active.coar-sidebar-item--collapsed {
  border: none;
  padding: 0.5rem;
}

.coar-sidebar-item--active:hover {
  background: var(--coar-sidebar-item-active-bg, var(--coar-background-accent-tertiary));
}

/* Disabled */
.coar-sidebar-item--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Icon */
.coar-sidebar-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.coar-sidebar-item__icon :deep([icon-name='square-dashed']) {
  opacity: 0.3;
}

/* Label */
.coar-sidebar-item__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Collapsed: square icon button. Centred on the cross-axis of the sidebar. */
.coar-sidebar-item--collapsed {
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
}

.coar-sidebar-item--collapsed.coar-sidebar-item--vertical {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.coar-sidebar-item--collapsed.coar-sidebar-item--horizontal {
  height: fit-content;
  margin-top: auto;
  margin-bottom: auto;
}

.coar-sidebar-item--collapsed .coar-sidebar-item__label {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .coar-sidebar-item {
    transition-duration: 0s;
  }
}
</style>
