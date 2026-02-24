<script setup lang="ts">
import CoarIcon from '../icon/CoarIcon.vue';
import { useMenuClose } from './menu-cascade';

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
  { disabled: false },
);

const emit = defineEmits<{
  clicked: [event: MenuItemClickEvent];
}>();

const closeMenu = useMenuClose();

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
    role="menuitem"
    class="coar-menu-item"
    :class="{ 'coar-menu-item--disabled': props.disabled }"
    :aria-disabled="props.disabled || undefined"
    :tabindex="props.disabled ? -1 : 0"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="coar-menu-item__icon" aria-hidden="true">
      <CoarIcon :name="props.icon || 'square-rounded-dashed'" size="s" />
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
  line-height: 1.5;
  color: var(--coar-text-neutral-primary, #545454);
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: background 100ms ease;
  outline: none;
}

.coar-menu-item:hover:not(.coar-menu-item--disabled) {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
}

.coar-menu-item:focus-visible {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  outline: 2px solid var(--coar-border-accent-primary, #156db7);
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
.coar-menu-item__icon :deep([icon-name='square-rounded-dashed']) {
  opacity: 0.3;
}

.coar-menu-item__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
