<script setup lang="ts">
import { computed, useId } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';

const panelId = `coar-sub-expand-${useId()}`;

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

const open = defineModel<boolean>('open', { default: false });

const isOpen = computed(() => open.value);

function toggle(event: Event) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  open.value = !open.value;
}
</script>

<template>
  <div class="coar-sub-expand-root">
    <div
      class="coar-sub-expand"
      :class="{
        'coar-sub-expand--disabled': props.disabled,
        'coar-sub-expand--open': isOpen,
      }"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      :aria-disabled="props.disabled || undefined"
      :tabindex="props.disabled ? -1 : 0"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
    >
      <span class="coar-sub-expand__icon" aria-hidden="true">
        <CoarIcon :name="props.icon || 'square-dashed'" size="s" />
      </span>
      <span class="coar-sub-expand__label">{{ props.label }}</span>
      <CoarIcon
        :name="isOpen ? 'minus' : 'plus'"
        size="xs"
        class="coar-sub-expand__arrow"
        aria-hidden="true"
      />
    </div>

    <div
      :id="panelId"
      class="coar-sub-expand__panel"
      :class="{ 'coar-sub-expand__panel--open': isOpen }"
      :aria-hidden="!isOpen || undefined"
      role="group"
    >
      <div class="coar-sub-expand__panel-inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-sub-expand-root {
  display: block;
}

.coar-sub-expand {
  display: flex;
  align-items: center;
  gap: var(--coar-menu-item-gap);
  width: 100%;
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
}

.coar-sub-expand:hover:not(.coar-sub-expand--disabled) {
  background: var(--coar-background-neutral-secondary);
}

.coar-sub-expand:focus-visible {
  background: var(--coar-background-neutral-secondary);
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-sub-expand--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-sub-expand__icon {
  flex-shrink: 0;
  display: var(--coar-menu-icon-slot-display);
  align-items: center;
  justify-content: center;
  width: var(--coar-menu-item-icon-slot-size);
  height: var(--coar-menu-item-icon-slot-size);
}

.coar-sub-expand__icon :deep([icon-name='square-dashed']) {
  opacity: 0.15;
}

.coar-sub-expand__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-sub-expand__arrow {
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0.6;
  transition: opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sub-expand:hover:not(.coar-sub-expand--disabled) .coar-sub-expand__arrow {
  opacity: 1;
}

/* Expandable panel with grid animation */
.coar-sub-expand__panel {
  box-sizing: border-box;
  margin-left: var(--coar-sub-expand-indent-offset);
  position: relative;
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-sub-expand__panel--open {
  grid-template-rows: 1fr;
}

.coar-sub-expand__panel-inner {
  overflow: hidden;
  min-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity var(--coar-duration-fast) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sub-expand__panel--open > .coar-sub-expand__panel-inner {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .coar-sub-expand,
  .coar-sub-expand__arrow,
  .coar-sub-expand__panel,
  .coar-sub-expand__panel-inner {
    transition-duration: 0s;
  }
}
</style>
