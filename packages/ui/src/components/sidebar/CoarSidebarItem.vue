<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import type { CoarIconSize } from '../icon/icon-service';
import { vTooltip } from '../tooltip/vTooltip';
import { SIDEBAR_COLLAPSED_KEY, SIDEBAR_ICON_SIZE_KEY, SIDEBAR_FLYOUT_ICON_ONLY_KEY } from './sidebar-context';

const props = withDefaults(
  defineProps<{
    /** Item label text */
    label: string;
    /** Icon name (required for collapsed mode) */
    icon?: string;
    /** Whether this item is currently active (e.g. current route) */
    active?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  { icon: undefined, active: false, disabled: false },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
const sidebarIconSize = inject(SIDEBAR_ICON_SIZE_KEY, ref<CoarIconSize>('m'));
const isIconOnly = inject(SIDEBAR_FLYOUT_ICON_ONLY_KEY, ref(false));

const tooltipConfig = computed(() => {
  if (isIconOnly.value) return { content: props.label, placement: 'right' as const, openDelay: 100 };
  if (!sidebarCollapsed.value) return false;
  return { content: props.label, placement: 'right' as const, openDelay: 200 };
});

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  emit('click', event);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (props.disabled) return;
  event.preventDefault();
  emit('click', new MouseEvent('click'));
}
</script>

<template>
  <div
    v-tooltip="tooltipConfig"
    role="menuitem"
    class="coar-sidebar-item"
    :class="{
      'coar-sidebar-item--active': props.active,
      'coar-sidebar-item--disabled': props.disabled,
      'coar-sidebar-item--collapsed': sidebarCollapsed,
    }"
    :aria-disabled="props.disabled || undefined"
    :aria-current="props.active ? 'page' : undefined"
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
}

.coar-sidebar-item:hover:not(.coar-sidebar-item--disabled) {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
}

.coar-sidebar-item:focus-visible {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

/* Active state */
.coar-sidebar-item--active {
  color: var(--coar-sidebar-item-active-color, var(--coar-text-accent-primary));
  background: var(--coar-sidebar-item-active-bg, var(--coar-background-accent-tertiary));
  font-weight: var(--coar-font-weight-medium);
  border-left: 3px solid currentColor;
  padding-left: calc(0.75rem - 3px);
}

.coar-sidebar-item--active.coar-sidebar-item--collapsed {
  border-left: none;
  padding-left: 0.5rem;
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

/* Collapsed mode: square icon button, centered */
.coar-sidebar-item--collapsed {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
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
