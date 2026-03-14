<script setup lang="ts">
import { ref, watch, computed, inject, onMounted, onBeforeUnmount, nextTick } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import { computeOverlayCoordinates } from '../overlay/overlay-position';
import {
  MenuCascade,
  useMenuCascade,
  provideMenuCascade,
  provideMenuClose,
  MENU_NAV_KEY,
} from './menu-cascade';

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

const parentCascade = useMenuCascade();
const cascade = new MenuCascade(parentCascade ?? null);
provideMenuCascade(cascade);

const menuNav = inject(MENU_NAV_KEY, undefined);

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const itemRef = ref<HTMLElement | null>(null);

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

// Allow child submenus to cancel our close timer via cascade
cascade.onChildPanelEnter = () => cancelCloseTimer();

// Provide close function so nested menu items can close the entire tree
provideMenuClose(() => {
  closeSubmenu();
});

function openSubmenu(anchorEl: HTMLElement) {
  if (isOpen.value) return;

  // Close siblings
  cascade.closeSiblings();

  isOpen.value = true;

  nextTick(() => {
    positionPanel(anchorEl);

    // Register with cascade
    cascade.overlayRef = {
      panelEl: panelRef.value,
      close: () => closeSubmenu(),
    };
    parentCascade?.notifyChildOpened();
  });
}

function closeSubmenu() {
  if (!isOpen.value) return;
  isOpen.value = false;

  if (cascade.overlayRef) {
    cascade.overlayRef = null;
  }
  parentCascade?.notifyChildClosed(cascade);
}

function positionPanel(anchorEl: HTMLElement) {
  const panel = panelRef.value;
  if (!panel) return;

  const ar = anchorEl.getBoundingClientRect();
  const pr = panel.getBoundingClientRect();

  const coords = computeOverlayCoordinates(
    {
      left: ar.left,
      top: ar.top,
      right: ar.right,
      bottom: ar.bottom,
      width: ar.width,
      height: ar.height,
    },
    { width: pr.width || 200, height: pr.height || 100 },
    { placement: ['right-start', 'left-start'], offset: -4, flip: false, shift: true },
    { width: window.innerWidth, height: window.innerHeight },
  );

  panel.style.left = `${coords.left}px`;
  panel.style.top = `${coords.top}px`;
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

function onPanelMouseEnter() {
  cancelCloseTimer();
  // Cancel close timers on parent submenus (their panel mouseleave fired
  // because this teleported panel is not a DOM descendant)
  parentCascade?.cancelAncestorCloseTimers();
}

function onPanelMouseLeave() {
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

  // ArrowRight: open submenu and focus first item inside
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    event.stopPropagation();
    if (!isOpen.value) {
      openSubmenu(itemRef.value!);
    }
    // Focus the first focusable menuitem in the submenu panel
    nextTick(() => {
      const firstItem = panelRef.value?.querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      firstItem?.focus();
    });
    return;
  }

  // ArrowLeft: close submenu and return focus to this item
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

// Click-outside handler
// Track the click event that opened the menu to avoid immediately closing
let openingEvent: MouseEvent | null = null;

function onDocumentClick(event: MouseEvent) {
  if (!isOpen.value) return;
  // Ignore the click that opened the menu
  if (event === openingEvent) {
    openingEvent = null;
    return;
  }
  openingEvent = null;
  const target = event.target as Node;
  if (itemRef.value?.contains(target)) return;
  if (panelRef.value?.contains(target)) return;
  closeSubmenu();
}

let documentListenerAdded = false;

function addDocumentListener() {
  if (documentListenerAdded) return;
  document.addEventListener('click', onDocumentClick);
  documentListenerAdded = true;
}

function removeDocumentListener() {
  document.removeEventListener('click', onDocumentClick);
  documentListenerAdded = false;
}

// Watch open state to manage document listener
watch(isOpen, (val) => {
  if (val) {
    // Defer adding listener so it doesn't catch the current click
    requestAnimationFrame(() => addDocumentListener());
  } else {
    removeDocumentListener();
  }
});

onBeforeUnmount(() => {
  unregister?.();
  cancelCloseTimer();
  removeDocumentListener();
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
      :aria-disabled="props.disabled || undefined"
      :tabindex="itemTabindex"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click="onClick"
      @keydown="onKeydown"
    >
      <span class="coar-submenu-item__icon" aria-hidden="true">
        <CoarIcon :name="props.icon || 'square-rounded-dashed'" size="s" />
      </span>
      <span class="coar-submenu-item__label">{{ props.label }}</span>
      <CoarIcon
        name="chevron-right"
        size="xs"
        class="coar-submenu-item__arrow"
        aria-hidden="true"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="coar-submenu-panel"
        @mouseenter="onPanelMouseEnter"
        @mouseleave="onPanelMouseLeave"
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.coar-submenu-item-root {
  display: block;
}

.coar-submenu-item {
  display: flex;
  align-items: center;
  gap: var(--coar-menu-item-gap, 0.75rem);
  box-sizing: border-box;
  padding: var(--coar-menu-item-padding, 0.5rem 0.75rem);
  font-family: var(--coar-font-family-body, Poppins, sans-serif);
  font-size: var(--coar-menu-item-font-size, var(--coar-component-m-font-size, 14px));
  font-weight: var(--coar-font-weight-regular, 400);
  line-height: var(--coar-line-height-relaxed);
  color: var(--coar-text-neutral-primary, #545454);
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: background 100ms ease;
  outline: none;
}

.coar-submenu-item:hover:not(.coar-submenu-item--disabled) {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
}

.coar-submenu-item--open {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
}

.coar-submenu-item:focus-visible {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-submenu-item--disabled {
  color: var(--coar-text-neutral-disabled, #999999);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-submenu-item__icon {
  flex-shrink: 0;
  display: var(--coar-menu-icon-slot-display, inline-flex);
  align-items: center;
  justify-content: center;
  width: var(--coar-menu-item-icon-slot-size, 16px);
  height: var(--coar-menu-item-icon-slot-size, 16px);
}

.coar-submenu-item__icon :deep([icon-name='square-rounded-dashed']) {
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

<style>
/* Unscoped: teleported panel */
.coar-submenu-panel {
  position: fixed;
  z-index: var(--coar-z-overlay, 1000);
}
</style>
