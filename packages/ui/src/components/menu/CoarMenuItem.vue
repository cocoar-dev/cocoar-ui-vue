<script setup lang="ts">
import { ref, inject, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
    /** Disabled state */
    disabled?: boolean;
  }>(),
  { label: undefined, icon: undefined, disabled: false },
);

const emit = defineEmits<{
  clicked: [event: MenuItemClickEvent];
}>();

const closeMenu = useMenuClose();
const menuNav = inject(MENU_NAV_KEY, undefined);
const itemRef = ref<HTMLElement | null>(null);

// --- Roving tabindex registration ---
let unregister: (() => void) | null = null;

onMounted(() => {
  if (menuNav && itemRef.value) {
    const navItem = { el: itemRef.value, disabled: props.disabled };
    unregister = menuNav.register(navItem);

    // Keep disabled state in sync
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

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.stopPropagation();

  let shouldClose = true;
  const clickEvent: MenuItemClickEvent = {
    event,
    keepMenuOpen: () => {
      shouldClose = false;
    },
  };

  emit('clicked', clickEvent);

  if (shouldClose && closeMenu) {
    queueMicrotask(() => closeMenu());
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (props.disabled) return;
  event.preventDefault();

  let shouldClose = true;
  const clickEvent: MenuItemClickEvent = {
    event: new MouseEvent('click'),
    keepMenuOpen: () => {
      shouldClose = false;
    },
  };

  emit('clicked', clickEvent);

  if (shouldClose && closeMenu) {
    queueMicrotask(() => closeMenu());
  }
}
</script>

<template>
  <div
    ref="itemRef"
    role="menuitem"
    class="coar-menu-item"
    :class="{ 'coar-menu-item--disabled': props.disabled }"
    :aria-disabled="props.disabled || undefined"
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
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
  outline: none;
}

.coar-menu-item:hover:not(.coar-menu-item--disabled) {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
}

.coar-menu-item:focus-visible {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-menu-item--disabled {
  color: var(--coar-text-neutral-disabled, #999999);
  cursor: not-allowed;
  opacity: 0.5;
}

.coar-menu-item__icon {
  display: var(--coar-menu-icon-slot-display, inline-flex);
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--coar-menu-item-icon-slot-size, 16px);
  height: var(--coar-menu-item-icon-slot-size, 16px);
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
