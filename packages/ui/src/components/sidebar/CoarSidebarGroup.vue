<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import type { CoarIconSize } from '../icon/icon-service';
import { vTooltip } from '../tooltip/vTooltip';
import { computeOverlayCoordinates } from '../overlay/overlay-position';
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_ICON_SIZE_KEY,
  SIDEBAR_FLYOUT_ICON_ONLY_KEY,
  SIDEBAR_FLYOUT_PARENT_KEY,
} from './sidebar-context';
import type { SidebarFlyoutParent } from './sidebar-context';
import SidebarFlyoutProvider from './SidebarFlyoutProvider.vue';

const panelId = `coar-sidebar-group-${useId()}`;

const props = withDefaults(
  defineProps<{
    /** Group label text */
    label: string;
    /** Icon name (required for collapsed mode) */
    icon?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Display mode: 'expand' (inline) or 'flyout' (floating panel) */
    mode?: 'expand' | 'flyout';
    /** Flyout shows icon-only items with tooltips (no labels). Inherited by nested flyouts. */
    iconOnly?: boolean;
    /** Open flyout on hover instead of click. Only applies to mode="flyout". */
    openOnHover?: boolean;
  }>(),
  { icon: undefined, disabled: false, mode: 'expand', iconOnly: undefined, openOnHover: false },
);

const open = defineModel<boolean>('open', { default: false });
const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
const sidebarIconSize = inject(SIDEBAR_ICON_SIZE_KEY, ref<CoarIconSize>('m'));

// Inherit iconOnly from parent flyout if not explicitly set
const parentIconOnly = inject(SIDEBAR_FLYOUT_ICON_ONLY_KEY, ref(false));
const resolvedIconOnly = computed(() => props.iconOnly ?? parentIconOnly.value);

const isOpen = computed(() => open.value);
const isFlyout = computed(() => props.mode === 'flyout');
const isIconsMode = computed(() => resolvedIconOnly.value);

// Flyout state
const flyoutOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const flyoutRef = ref<HTMLElement | null>(null);
const flyoutStyle = ref<{ left: string; top: string }>({ left: '0px', top: '0px' });
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let openTimer: ReturnType<typeof setTimeout> | null = null;

// Parent-child flyout cascade: inject parent's close control, provide our own for children
const parentFlyout = inject(SIDEBAR_FLYOUT_PARENT_KEY, null);

// This flyout's control — passed to children via SidebarFlyoutProvider
const selfControl: SidebarFlyoutParent = {
  cancelClose: () => {
    cancelClose();
    parentFlyout?.cancelClose(); // cascade up
  },
  scheduleClose: () => {
    scheduleClose();
    parentFlyout?.scheduleClose(); // cascade up
  },
};

// Nested flyout triggers inside icon-only parent should render as icon-only too
const renderIconOnly = computed(() => parentIconOnly.value && !sidebarCollapsed.value);

const tooltipConfig = computed(() => {
  // Show tooltip when icon-only (collapsed or inside icon-only flyout)
  if (renderIconOnly.value) {
    if (isFlyout.value && flyoutOpen.value) return false;
    if (!isFlyout.value && isOpen.value) return false;
    return { content: props.label, placement: 'right' as const, openDelay: 100 };
  }
  if (!sidebarCollapsed.value) return false;
  if (isFlyout.value && flyoutOpen.value) return false;
  return { content: props.label, placement: 'right' as const, openDelay: 200 };
});

function toggle(event: Event) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isFlyout.value) {
    if (flyoutOpen.value) {
      closeFlyout();
    } else {
      openFlyout();
    }
    return;
  }

  open.value = !open.value;
}

// ── Flyout positioning ──────────────────────────────────────

function positionFlyout() {
  if (!triggerRef.value || !flyoutRef.value) return;

  const trigger = triggerRef.value.getBoundingClientRect();
  const panel = flyoutRef.value;
  const overlaySize = { width: panel.offsetWidth, height: panel.offsetHeight };

  // Use sidebar or parent flyout edge for horizontal positioning so overlap is consistent
  // regardless of trigger width (collapsed icon vs full-width row)
  const container = triggerRef.value.closest('.coar-sidebar') || triggerRef.value.closest('.coar-sidebar-flyout');
  const containerRect = container?.getBoundingClientRect();
  const anchorRect = containerRect
    ? { left: containerRect.left, top: trigger.top, right: containerRect.right, bottom: trigger.bottom, width: containerRect.width, height: trigger.height }
    : { left: trigger.left, top: trigger.top, right: trigger.right, bottom: trigger.bottom, width: trigger.width, height: trigger.height };

  const coords = computeOverlayCoordinates(
    anchorRect,
    overlaySize,
    { placement: ['right-start', 'left-start'], offset: -4, flip: true, shift: true },
    { width: window.innerWidth, height: window.innerHeight },
  );

  flyoutStyle.value = { left: `${coords.left}px`, top: `${coords.top}px` };
}

function openFlyout() {
  cancelClose();
  parentFlyout?.cancelClose(); // keep parent open while child opens
  flyoutOpen.value = true;
  nextTick(() => {
    positionFlyout();
    document.addEventListener('mousedown', onClickOutside, true);
    document.addEventListener('keydown', onEscape, true);
  });
}

function closeFlyout() {
  cancelClose();
  flyoutOpen.value = false;
  document.removeEventListener('mousedown', onClickOutside, true);
  document.removeEventListener('keydown', onEscape, true);
}

function scheduleClose() {
  cancelClose();
  closeTimer = setTimeout(() => closeFlyout(), 300);
}

function cancelClose() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function scheduleOpen() {
  cancelOpen();
  openTimer = setTimeout(() => openFlyout(), 200);
}

function cancelOpen() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
}

function onTriggerEnter() {
  if (flyoutOpen.value) cancelClose();
  else if (isFlyout.value && props.openOnHover) scheduleOpen();
  parentFlyout?.cancelClose(); // keep parent open when hovering trigger
}

function onTriggerLeave() {
  cancelOpen();
  if (flyoutOpen.value) scheduleClose();
}

function onFlyoutEnter() {
  cancelClose();
  parentFlyout?.cancelClose(); // keep parent open when hovering child panel
}

function onFlyoutLeave() {
  scheduleClose();
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (triggerRef.value?.contains(target) || flyoutRef.value?.contains(target)) return;
  // Don't close if click is inside any descendant flyout panel
  const flyoutPanels = document.querySelectorAll('.coar-sidebar-flyout');
  for (const panel of flyoutPanels) {
    if (panel.contains(target)) return;
  }
  closeFlyout();
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeFlyout();
    triggerRef.value?.focus();
  }
}

// Close flyout when sidebar collapsed state changes
watch(sidebarCollapsed, () => {
  if (flyoutOpen.value) closeFlyout();
});

onBeforeUnmount(() => {
  cancelClose();
  cancelOpen();
  document.removeEventListener('mousedown', onClickOutside, true);
  document.removeEventListener('keydown', onEscape, true);
});
</script>

<template>
  <div class="coar-sidebar-group" :class="{ 'coar-sidebar-group--collapsed': sidebarCollapsed, 'coar-sidebar-group--icon-only': renderIconOnly }">
    <!-- Trigger -->
    <div
      ref="triggerRef"
      v-tooltip="tooltipConfig"
      class="coar-sidebar-group__trigger"
      :class="{
        'coar-sidebar-group__trigger--disabled': props.disabled,
        'coar-sidebar-group__trigger--open': isFlyout ? flyoutOpen : isOpen,
      }"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="isFlyout ? flyoutOpen : isOpen"
      :aria-controls="panelId"
      :aria-disabled="props.disabled || undefined"
      :tabindex="props.disabled ? -1 : 0"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
      @mouseenter="onTriggerEnter"
      @mouseleave="onTriggerLeave"
    >
      <span class="coar-sidebar-group__icon" aria-hidden="true">
        <CoarIcon :name="props.icon || 'square-dashed'" :size="sidebarIconSize" />
        <span class="coar-sidebar-group__caret">
          <CoarIcon
            :name="isFlyout
              ? (flyoutOpen ? 'chevron-down' : 'chevron-right')
              : (isOpen ? 'minus' : 'plus')"
            size="xs"
          />
        </span>
      </span>
      <span class="coar-sidebar-group__label">{{ props.label }}</span>
      <CoarIcon
        :name="isFlyout
          ? (flyoutOpen ? 'chevron-down' : 'chevron-right')
          : (isOpen ? 'minus' : 'plus')"
        size="xs"
        class="coar-sidebar-group__chevron"
        aria-hidden="true"
      />
    </div>

    <!-- Expand panel (mode="expand") -->
    <div
      v-if="!isFlyout"
      :id="panelId"
      class="coar-sidebar-group__panel"
      :class="{ 'coar-sidebar-group__panel--open': isOpen }"
      :aria-hidden="!isOpen || undefined"
      role="group"
    >
      <div class="coar-sidebar-group__panel-inner">
        <slot />
      </div>
    </div>

    <!-- Flyout panel (mode="flyout") -->
    <Teleport to="body">
      <SidebarFlyoutProvider v-if="isFlyout && flyoutOpen" :icon-only="resolvedIconOnly" :parent-control="selfControl">
        <div
          :id="panelId"
          ref="flyoutRef"
          class="coar-sidebar-flyout"
          :class="{ 'coar-sidebar-flyout--icons': isIconsMode }"
          role="menu"
          :style="flyoutStyle"
          @mouseenter="onFlyoutEnter"
          @mouseleave="onFlyoutLeave"
        >
          <div v-if="!isIconsMode" class="coar-sidebar-flyout__header">{{ props.label }}</div>
          <div class="coar-sidebar-flyout__items">
            <slot />
          </div>
        </div>
      </SidebarFlyoutProvider>
    </Teleport>
  </div>
</template>

<style scoped>
.coar-sidebar-group__trigger {
  display: flex;
  align-items: center;
  gap: var(--coar-sidebar-item-gap, 0.75rem);
  width: 100%;
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

.coar-sidebar-group__trigger:hover:not(.coar-sidebar-group__trigger--disabled) {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
}

.coar-sidebar-group__trigger:focus-visible {
  background: var(--coar-sidebar-item-hover, var(--coar-background-neutral-tertiary));
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-sidebar-group__trigger--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Icon */
.coar-sidebar-group__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.coar-sidebar-group__icon :deep([icon-name='square-dashed']) {
  opacity: 0.15;
}

/* Small caret badge at bottom-right of icon (collapsed only) */
.coar-sidebar-group__caret {
  position: absolute;
  bottom: -3px;
  right: -9px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 10px;
  height: 10px;
  opacity: 0.7;
}

.coar-sidebar-group__caret :deep(.coar-icon-host) {
  width: 8px !important;
  height: 8px !important;
}

.coar-sidebar-group__trigger:hover .coar-sidebar-group__caret {
  opacity: 1;
}

/* Label */
.coar-sidebar-group__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Chevron */
.coar-sidebar-group__chevron {
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0.5;
  transition:
    opacity var(--coar-duration-fast) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sidebar-group__trigger:hover:not(.coar-sidebar-group__trigger--disabled)
  .coar-sidebar-group__chevron {
  opacity: 1;
}

/* Expandable panel with grid animation */
.coar-sidebar-group__panel {
  box-sizing: border-box;
  padding-left: var(--coar-sidebar-group-indent, 16px);
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-sidebar-group__panel--open {
  grid-template-rows: 1fr;
}

.coar-sidebar-group__panel-inner {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity var(--coar-duration-fast) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sidebar-group__panel--open > .coar-sidebar-group__panel-inner {
  opacity: 1;
  transform: translateY(0);
}

/* ========================================
   Collapsed mode
   ======================================== */

/* Trigger: square icon button, centered */
.coar-sidebar-group--collapsed .coar-sidebar-group__trigger {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
}

.coar-sidebar-group--collapsed .coar-sidebar-group__label {
  display: none;
}

.coar-sidebar-group--collapsed .coar-sidebar-group__caret {
  display: flex;
}

.coar-sidebar-group--collapsed .coar-sidebar-group__chevron {
  display: none;
}

/* Panel: no indent, children centered under parent */
.coar-sidebar-group--collapsed .coar-sidebar-group__panel {
  --coar-sidebar-group-indent: 0;
}

.coar-sidebar-group--collapsed .coar-sidebar-group__panel :deep(.coar-sidebar-item) {
  padding: 0.25rem 0.375rem;
  margin-left: auto;
  margin-right: auto;
}

.coar-sidebar-group--collapsed .coar-sidebar-group__panel :deep(.coar-sidebar-item__icon) {
  transform: scale(0.75);
  opacity: 0.65;
}

/* Spacing after collapsed group to separate from next sibling */
.coar-sidebar-group--collapsed {
  margin-bottom: 0.25rem;
}

/* ========================================
   Icon-only mode (nested in icon-only flyout)
   Mirrors collapsed styles so trigger shows icon + caret
   ======================================== */

.coar-sidebar-group--icon-only .coar-sidebar-group__trigger {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
}

.coar-sidebar-group--icon-only .coar-sidebar-group__label {
  display: none;
}

.coar-sidebar-group--icon-only .coar-sidebar-group__caret {
  display: flex;
}

.coar-sidebar-group--icon-only .coar-sidebar-group__chevron {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .coar-sidebar-group__trigger,
  .coar-sidebar-group__chevron,
  .coar-sidebar-group__panel,
  .coar-sidebar-group__panel-inner {
    transition-duration: 0s;
  }
}
</style>

<!-- Flyout panel is teleported to body, so styles must be unscoped -->
<style>
.coar-sidebar-flyout {
  position: fixed;
  z-index: var(--coar-z-overlay, 1000);
  min-width: 180px;
  max-width: 260px;
  padding: 0.375rem;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-elevation-medium);
}

.coar-sidebar-flyout__header {
  padding: 0.375rem 0.75rem;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-component-s-font-size);
  font-weight: var(--coar-font-weight-semibold);
  color: var(--coar-text-neutral-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.coar-sidebar-flyout__items {
  display: flex;
  flex-direction: column;
}

/* Icons mode: grid layout */
.coar-sidebar-flyout--icons {
  min-width: auto;
  max-width: none;
}

.coar-sidebar-flyout--icons .coar-sidebar-flyout__items {
  display: flex;
  flex-direction: column;
}

.coar-sidebar-flyout--icons .coar-sidebar-flyout__items .coar-sidebar-item {
  width: fit-content;
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
  justify-content: center;
}

.coar-sidebar-flyout--icons .coar-sidebar-flyout__items .coar-sidebar-item .coar-sidebar-item__label {
  display: none;
}

/* Icon-only flyout: nested group triggers should look like icon buttons */
.coar-sidebar-flyout--icons .coar-sidebar-flyout__items .coar-sidebar-group--icon-only .coar-sidebar-group__trigger {
  width: fit-content;
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
  justify-content: center;
}

/* Icon-only flyout: expand panel — no indent, children centered as icons */
.coar-sidebar-flyout--icons .coar-sidebar-group--icon-only .coar-sidebar-group__panel {
  --coar-sidebar-group-indent: 0;
}

.coar-sidebar-flyout--icons .coar-sidebar-group--icon-only .coar-sidebar-group__panel .coar-sidebar-item {
  width: fit-content;
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
  justify-content: center;
}

.coar-sidebar-flyout--icons .coar-sidebar-group--icon-only .coar-sidebar-group__panel .coar-sidebar-item .coar-sidebar-item__label {
  display: none;
}

/* Labels mode: override collapsed styles if children are in collapsed state */
.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-item--collapsed {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
  border-radius: var(--coar-sidebar-item-radius, var(--coar-radius-xxs));
}

.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-item--collapsed .coar-sidebar-item__label {
  display: inline;
}

/* Labels mode: override collapsed styles for nested group triggers */
.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-group--collapsed .coar-sidebar-group__trigger {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
  border-radius: var(--coar-sidebar-item-radius, var(--coar-radius-xxs));
}

.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-group--collapsed .coar-sidebar-group__label {
  display: inline;
}

.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-group--collapsed .coar-sidebar-group__chevron {
  display: inline-flex;
}

.coar-sidebar-flyout:not(.coar-sidebar-flyout--icons) .coar-sidebar-flyout__items .coar-sidebar-group--collapsed .coar-sidebar-group__caret {
  display: none;
}
</style>
