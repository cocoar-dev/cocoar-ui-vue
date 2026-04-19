<script setup lang="ts">
/**
 * Cascading submenu trigger. Opens a child overlay via the overlay-service, which means:
 *
 *  - **Stacks correctly** inside a dialog/popover/context-menu: `useOverlayParent()` picks
 *    up the nearest ancestor overlay and passes it to `open({ parent })`; the service then
 *    computes z-index as `--coar-z-overlay + id*2`, guaranteeing the submenu sits above
 *    the parent.
 *  - **Click-outside awareness** is tree-aware: a click inside the submenu is treated as
 *    a click inside the parent, so the parent overlay does not close when the user clicks
 *    a submenu item. Clicking outside the whole overlay tree closes the root.
 *
 * The component keeps its own menu-cascade / menu-aim / hover-close-timer logic because
 * those behaviors are richer than what `dismiss.hoverTree` models today. The service only
 * replaces teleport / positioning / z-index / document click-outside.
 */
import {
  ref,
  watch,
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  nextTick,
  useId,
  useSlots,
  markRaw,
  type VNode,
} from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { subFlyoutPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import {
  MenuCascade,
  useMenuCascade,
  useMenuClose,
  provideMenuCascade,
  provideMenuClose,
  MENU_NAV_KEY,
} from './menu-cascade';
import CoarSubFlyoutPanel from './CoarSubFlyoutPanel.vue';

const props = withDefaults(
  defineProps<{
    /** Label text */
    label: string;
    /** Optional icon name */
    icon?: string;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  { icon: undefined, disabled: false },
);

const slots = useSlots();
const submenuPanelId = `coar-submenu-panel-${useId()}`;

const parentCascade = useMenuCascade();
const cascade = new MenuCascade(parentCascade ?? null);
provideMenuCascade(cascade);

const menuNav = inject(MENU_NAV_KEY, undefined);
const parentOverlay = useOverlayParent();

const isOpen = ref(false);
const itemRef = ref<HTMLElement | null>(null);
let overlayRef: OverlayRef | null = null;

// --- Roving tabindex registration ---
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

const itemTabindex = computed(() => {
  if (props.disabled) return -1;
  if (!menuNav) return 0;
  const idx = menuNav.items.value.findIndex((item) => item.el === itemRef.value);
  return idx === menuNav.activeIndex.value ? 0 : -1;
});

let closeTimer: ReturnType<typeof setTimeout> | null = null;

cascade.onChildPanelEnter = () => cancelCloseTimer();

const parentCloseMenu = useMenuClose();

function closeTree() {
  closeSubmenu();
  parentCloseMenu?.();
}

provideMenuClose(closeTree);

function renderContent(): VNode[] | undefined {
  return slots.default?.();
}

function openSubmenu(anchorEl: HTMLElement) {
  if (isOpen.value) return;

  cascade.closeSiblings();
  isOpen.value = true;

  const ref = getOverlayService().open({
    spec: {
      ...subFlyoutPreset,
      anchor: { kind: 'element', element: anchorEl },
    },
    content: { kind: 'component', component: markRaw(CoarSubFlyoutPanel) },
    inputs: {
      id: submenuPanelId,
      renderContent,
      cascade,
      closeTree,
      onPanelEnter: () => {
        cancelCloseTimer();
        // A child panel being hovered means the pointer reached us — cancel any
        // ancestor close timers that tracked the transition from their panel into
        // a region the DOM doesn't treat as a descendant (teleported into body).
        parentCascade?.cancelAncestorCloseTimers();
      },
      onPanelLeave: () => startCloseTimer(),
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

  // Register the mounted panel with the cascade tree so menu-aim can measure it.
  // `panelElement` is `null` until the service has mounted the outlet (one tick).
  nextTick(() => {
    if (overlayRef !== ref || ref.isClosed) return;
    cascade.overlayRef = {
      panelEl: ref.panelElement,
      close: () => closeSubmenu(),
    };
    parentCascade?.notifyChildOpened();
  });

  // Sync local state if the service closes the overlay externally (outside click,
  // escape, parent tree teardown). Local `closeSubmenu()` nulls `overlayRef` first,
  // so the guard below skips cleanup it has already performed.
  ref.afterClosed.then(() => {
    if (!isOpen.value) return;
    if (overlayRef !== ref) return;
    overlayRef = null;
    isOpen.value = false;
    cascade.overlayRef = null;
    cancelCloseTimer();
    parentCascade?.notifyChildClosed(cascade);
  });
}

function closeSubmenu() {
  if (!isOpen.value) return;
  isOpen.value = false;
  cascade.overlayRef = null;
  cancelCloseTimer();
  parentCascade?.notifyChildClosed(cascade);

  const ref = overlayRef;
  overlayRef = null;
  if (ref && !ref.isClosed) {
    ref.close();
  }
}

function onMouseEnter(event: MouseEvent) {
  if (props.disabled) return;
  cancelCloseTimer();

  const anchor = event.currentTarget as HTMLElement;

  if (parentCascade) {
    parentCascade.requestOpenFromChild(cascade, () => openSubmenu(anchor), {
      x: event.clientX,
      y: event.clientY,
    });
  } else {
    openSubmenu(anchor);
  }
}

function onMouseLeave() {
  if (props.disabled) return;
  startCloseTimer();
}

function startCloseTimer() {
  cancelCloseTimer();
  closeTimer = setTimeout(() => {
    closeSubmenu();
  }, 80);
}

function cancelCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function onClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.stopPropagation();

  if (isOpen.value) {
    closeSubmenu();
  } else {
    openSubmenu(event.currentTarget as HTMLElement);
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (isOpen.value) {
      closeSubmenu();
    } else {
      openSubmenu(itemRef.value!);
    }
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    event.stopPropagation();
    if (!isOpen.value) {
      openSubmenu(itemRef.value!);
    }
    // Focus the first enabled menuitem inside the submenu panel. `panelElement` lands
    // after the service mounts the outlet — one nextTick is enough.
    nextTick(() => {
      const firstItem = overlayRef?.panelElement?.querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      firstItem?.focus();
    });
    return;
  }

  if (event.key === 'ArrowLeft') {
    if (isOpen.value) {
      event.preventDefault();
      event.stopPropagation();
      closeSubmenu();
      itemRef.value?.focus();
    }
    return;
  }
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeSubmenu();
  },
);

onBeforeUnmount(() => {
  unregister?.();
  cancelCloseTimer();
  // Close via the service so the panel is removed from the DOM cleanly.
  if (overlayRef && !overlayRef.isClosed) {
    overlayRef.close();
  }
  overlayRef = null;
  cascade.destroy();
});
</script>

<template>
  <div class="coar-submenu-item-root">
    <div
      ref="itemRef"
      class="coar-submenu-item"
      :class="{
        'coar-submenu-item--disabled': props.disabled,
        'coar-submenu-item--open': isOpen,
      }"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="submenuPanelId"
      :aria-disabled="props.disabled || undefined"
      :tabindex="itemTabindex"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click="onClick"
      @keydown="onKeydown"
    >
      <span class="coar-submenu-item__icon" aria-hidden="true">
        <CoarIcon :name="props.icon || 'square-dashed'" size="s" />
      </span>
      <span class="coar-submenu-item__label">{{ props.label }}</span>
      <CoarIcon
        name="chevron-right"
        size="xs"
        class="coar-submenu-item__arrow"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.coar-submenu-item-root {
  display: block;
}

.coar-submenu-item {
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
  transition: background 100ms ease;
  outline: none;
}

.coar-submenu-item:hover:not(.coar-submenu-item--disabled) {
  background: var(--coar-background-neutral-secondary);
}

.coar-submenu-item--open {
  background: var(--coar-background-neutral-secondary);
}

.coar-submenu-item:focus-visible {
  background: var(--coar-background-neutral-secondary);
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-submenu-item--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-submenu-item__icon {
  flex-shrink: 0;
  display: var(--coar-menu-icon-slot-display);
  align-items: center;
  justify-content: center;
  width: var(--coar-menu-item-icon-slot-size);
  height: var(--coar-menu-item-icon-slot-size);
}

.coar-submenu-item__icon :deep([icon-name='square-dashed']) {
  opacity: 0.15;
}

.coar-submenu-item__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-submenu-item__arrow {
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0.6;
  transition: opacity 100ms ease;
}

.coar-submenu-item:hover:not(.coar-submenu-item--disabled) .coar-submenu-item__arrow {
  opacity: 1;
}
</style>
