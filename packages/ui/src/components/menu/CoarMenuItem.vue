<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRouterLink } from '../_internal/use-router-link';
// Type-only import — erased at runtime, no bundling impact. `vue-router` is
// an optional `peerDependenciesMeta` entry so consumers without a router can
// still use `CoarMenuItem` with `@clicked` only (no `to`). Modern tsconfigs
// with `skipLibCheck: true` (the default in vue-tsc) avoid type-resolution
// errors for non-router consumers reading our emitted `.d.ts`.
import type { RouteLocationRaw } from 'vue-router';
import CoarIcon from '../icon/CoarIcon.vue';
import { useMenuClose, MENU_NAV_KEY } from './menu-cascade';

export interface MenuItemClickEvent {
  /** Call to prevent auto-close of the menu tree */
  keepMenuOpen(): void;
  /** Original mouse event */
  event: MouseEvent;
}

const props = withDefaults(
  defineProps<{
    /** Item label text (alternative to default slot) */
    label?: string;
    /** Optional icon name */
    icon?: string;
    /**
     * Optional Vue Router target. Accepts anything `RouterLink.to` accepts
     * (string path, named-route object, etc.). When set the item renders as a
     * real `<a href>` so middle-click / ctrl-click open a new tab, right-click
     * exposes "Open in new tab" / "Copy link address", and screenreaders
     * announce "link to {label}" instead of just "menuitem". Routing is
     * delegated to `RouterLink` when `vue-router` is installed; otherwise a
     * plain `<a>` is rendered (works for absolute URLs via the browser's
     * native navigation). `vue-router` is intentionally NOT a peerDependency.
     *
     * `clicked` is still emitted on plain-click after navigation kicks off,
     * so `keepMenuOpen()` and other consumer side-effects continue to work.
     * On modifier-click (Ctrl/Cmd/Middle = new tab) the click event is
     * suppressed by the browser default — the menu does NOT auto-close so
     * the user can fire several link items in a row.
     */
    to?: RouteLocationRaw | string;
    /**
     * Whether this item is currently active. Used for menu items that
     * represent a current selection (e.g. view-mode toggle: "✓ List view",
     * settings sub-menu: "✓ Light theme", context-menu sort indicators).
     *
     * If `to` is set and `active` is left undefined, the active state is
     * inferred from `RouterLink`'s `isActive` — drift between consumer-
     * computed `route.path === '/x'` and the router's own matching is
     * eliminated. Setting `active` explicitly always wins (use for non-route
     * active states like "current selection").
     *
     * The menu still auto-closes when an active item is clicked (the active
     * state is visible WHILE the menu is open — that's when it matters).
     */
    active?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  { label: undefined, icon: undefined, to: undefined, active: undefined, disabled: false },
);

const emit = defineEmits<{
  clicked: [event: MenuItemClickEvent];
}>();

const closeMenu = useMenuClose();
const menuNav = inject(MENU_NAV_KEY, undefined);
const itemRef = ref<HTMLElement | null>(null);

// Soft Vue Router integration — see use-router-link.ts.
const { RouterLink, hasRouterLink, warnIfMisconfigured } = useRouterLink();
watch(
  () => props.to,
  (to) => warnIfMisconfigured(to, 'CoarMenuItem'),
  { immediate: true },
);
const hasTo = computed(() => props.to !== undefined && props.to !== null);

// Active-state computation, mirroring CoarSidebarItem. RouterLink's `isActive`
// is read inline from the slot scope (Branch 1) and fed in via `classesFor` /
// `ariaCurrentFor`; the other branches pass `false` since there is no router
// match to compute. `props.active ?? routerIsActive` lets consumer overrides
// win over auto-detection (use for non-route "selected" states).
function classesFor(routerIsActive: boolean): Record<string, boolean> {
  const isActive = props.active ?? routerIsActive;
  return {
    'coar-menu-item--active': isActive,
    'coar-menu-item--disabled': props.disabled,
  };
}

function ariaCurrentFor(routerIsActive: boolean): 'page' | undefined {
  const isActive = props.active ?? routerIsActive;
  return isActive ? 'page' : undefined;
}

// --- Roving tabindex registration ---
// Required even on the <a>-link branch: arrow-key navigation inside the menu
// switches focus between siblings, and the active item must have tabindex=0
// while the rest have tabindex=-1. Native <a> tabbability alone is not enough
// — without roving control, Tab would land on every item and arrow keys
// wouldn't move focus.
let unregister: (() => void) | null = null;

onMounted(() => {
  if (menuNav && itemRef.value) {
    const navItem = { el: itemRef.value, disabled: props.disabled };
    unregister = menuNav.register(navItem);

    watch(
      () => props.disabled,
      (val) => {
        navItem.disabled = val;
      },
    );
  }
});

onBeforeUnmount(() => {
  unregister?.();
});

const itemTabindex = computed(() => {
  if (props.disabled) return -1;
  if (!menuNav) return 0; // no parent menu context, fallback to always-focusable
  const idx = menuNav.items.value.findIndex((item) => item.el === itemRef.value);
  return idx === menuNav.activeIndex.value ? 0 : -1;
});

// Modifier-click detection mirrors the browser's "open in new tab" criteria.
// On a modifier-click the browser handles the link (new tab) without firing
// SPA navigation — and we treat the menu as "user is opening a new tab, keep
// menu open in case they want to open another sibling too". This matches what
// macOS Finder / Chrome bookmarks bar do.
function isModifierClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function emitClicked(event: MouseEvent): { shouldClose: boolean } {
  let shouldClose = true;
  const clickEvent: MenuItemClickEvent = {
    event,
    keepMenuOpen: () => {
      shouldClose = false;
    },
  };
  emit('clicked', clickEvent);
  return { shouldClose };
}

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.stopPropagation();

  const { shouldClose } = emitClicked(event);

  if (shouldClose && closeMenu) {
    queueMicrotask(() => closeMenu());
  }
}

function handleAnchorClick(
  event: MouseEvent,
  navigate?: (e?: MouseEvent) => Promise<unknown>,
) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Three orthogonal decisions, kept explicit instead of conflated in a
  // single early-return so future edits don't accidentally couple them:
  //   1. emit `clicked` — always, so consumers see every interaction
  //      (including modifier-clicks for telemetry).
  //   2. navigate via SPA router — only on plain-click; modifier-clicks
  //      stay with the browser's native new-tab path. navigate() would
  //      no-op anyway via RouterLink.guardEvent, but skipping it is cleaner.
  //   3. close the menu — auto-close on plain-click only. Modifier-click
  //      keeps the menu open so the user can fire several link items in a
  //      row (matches macOS Finder / Chrome bookmarks bar pattern).
  //      `keepMenuOpen()` in the consumer's handler suppresses close on
  //      either path.
  const isModifier = isModifierClick(event);
  const { shouldClose } = emitClicked(event);

  if (!isModifier && navigate) {
    // Custom-slot mode: RouterLink does NOT wire its own click handler, so
    // we hand off explicitly. Do NOT preventDefault first — guardEvent
    // inside navigate() bails if the event is already prevented.
    void navigate(event);
  }

  if (shouldClose && closeMenu && !isModifier) {
    queueMicrotask(() => closeMenu());
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (props.disabled) return;

  // For anchor links, Enter natively triggers a click on the underlying
  // `<a>` — that path goes through handleAnchorClick and does the right
  // thing (emit + navigate + close). We must NOT call emitClicked/closeMenu
  // here because that would double-fire (once from keydown, once from the
  // browser-synthesized click that follows).
  if (hasTo.value && event.key === 'Enter') {
    return;
  }

  event.preventDefault();

  // Space on an `<a>` does NOT trigger a native click in any browser, so for
  // link-rendered items we synthesize a click on the element itself. That
  // routes through handleAnchorClick and unifies the Space path with the
  // mouse-click path (RouterLink navigation, modifier handling, emit, close
  // — all in one place). Without this, Space on a link-menu-item would emit
  // + close the menu but NEVER navigate, a silent UX bug.
  if (hasTo.value && itemRef.value) {
    itemRef.value.click();
    return;
  }

  // No-`to` branch: original click-emit-only behaviour.
  const synthetic = new MouseEvent('click');
  const { shouldClose } = emitClicked(synthetic);

  if (shouldClose && closeMenu) {
    queueMicrotask(() => closeMenu());
  }
}
</script>

<template>
  <!-- `to` + router available: RouterLink in custom mode, anchor rendered by us. -->
  <component
    :is="RouterLink"
    v-if="hasTo && hasRouterLink"
    :to="to"
    custom
  >
    <template #default="{ href, isActive, navigate }">
      <a
        ref="itemRef"
        role="menuitem"
        :href="href"
        class="coar-menu-item"
        :class="classesFor(isActive)"
        :aria-disabled="props.disabled || undefined"
        :aria-current="ariaCurrentFor(isActive)"
        :tabindex="itemTabindex"
        @click="(e) => handleAnchorClick(e, navigate)"
        @keydown="handleKeydown"
      >
        <span class="coar-menu-item__icon" aria-hidden="true">
          <CoarIcon :name="props.icon || 'square-dashed'" size="s" />
        </span>
        <span class="coar-menu-item__label">
          <template v-if="props.label">{{ props.label }}</template>
          <slot v-else />
        </span>
      </a>
    </template>
  </component>

  <!-- `to` set, no router: plain <a> fallback. -->
  <a
    v-else-if="hasTo"
    ref="itemRef"
    role="menuitem"
    :href="String(to)"
    class="coar-menu-item"
    :class="classesFor(false)"
    :aria-disabled="props.disabled || undefined"
    :aria-current="ariaCurrentFor(false)"
    :tabindex="itemTabindex"
    @click="handleAnchorClick"
    @keydown="handleKeydown"
  >
    <span class="coar-menu-item__icon" aria-hidden="true">
      <CoarIcon :name="props.icon || 'square-dashed'" size="s" />
    </span>
    <span class="coar-menu-item__label">
      <template v-if="props.label">{{ props.label }}</template>
      <slot v-else />
    </span>
  </a>

  <!-- No `to`: original <div role="menuitem"> path for action items. -->
  <div
    v-else
    ref="itemRef"
    role="menuitem"
    class="coar-menu-item"
    :class="classesFor(false)"
    :aria-disabled="props.disabled || undefined"
    :aria-current="ariaCurrentFor(false)"
    :tabindex="itemTabindex"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="coar-menu-item__icon" aria-hidden="true">
      <CoarIcon :name="props.icon || 'square-dashed'" size="s" />
    </span>
    <span class="coar-menu-item__label">
      <template v-if="props.label">{{ props.label }}</template>
      <slot v-else />
    </span>
  </div>
</template>

<style scoped>
.coar-menu-item {
  display: flex;
  align-items: center;
  gap: var(--coar-menu-item-gap);
  box-sizing: border-box;
  padding: var(--coar-menu-item-padding);
  font-family: var(--coar-menu-item-font-family);
  font-size: var(--coar-menu-item-font-size);
  font-weight: var(--coar-menu-item-font-weight);
  line-height: var(--coar-menu-item-line-height);
  color: var(--coar-menu-item-color);
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
  outline: none;
  /* Reset native <a> defaults so the link variant looks identical to <div>. */
  text-decoration: none;
}

.coar-menu-item:hover:not(.coar-menu-item--disabled) {
  background: var(--coar-background-neutral-secondary);
}

.coar-menu-item:focus-visible {
  background: var(--coar-background-neutral-secondary);
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-menu-item--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Active state — used for menu items representing a current selection
   (view-mode toggle, settings sub-menu, sort-direction indicator). Tokens
   match the sidebar/menu accent treatment so visually the two stay in
   sync without copy-pasting per-component palette overrides. */
.coar-menu-item--active {
  color: var(--coar-menu-item-active-color, var(--coar-text-accent-primary));
  background: var(--coar-menu-item-active-bg, var(--coar-background-accent-tertiary));
  font-weight: var(--coar-font-weight-medium);
}

.coar-menu-item--active:hover:not(.coar-menu-item--disabled) {
  background: var(--coar-menu-item-active-bg, var(--coar-background-accent-tertiary));
}

.coar-menu-item__icon {
  display: var(--coar-menu-icon-slot-display);
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--coar-menu-item-icon-slot-size);
  height: var(--coar-menu-item-icon-slot-size);
}

/* Placeholder icon: very subtle */
.coar-menu-item__icon :deep([icon-name='square-dashed']) {
  opacity: 0.3;
}

.coar-menu-item__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
