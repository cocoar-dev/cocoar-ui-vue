<script setup lang="ts">
import {
  computed, inject, onBeforeUnmount, ref, useId, useSlots, watch, markRaw,
  type VNode,
} from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import type { CoarIconSize } from '../icon/icon-service';
import { vTooltip } from '../tooltip/vTooltip';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { sidebarFlyoutPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_ICON_SIZE_KEY,
  SIDEBAR_FLYOUT_ICON_ONLY_KEY,
  SIDEBAR_FLYOUT_PARENT_KEY,
} from './sidebar-context';
import type { SidebarFlyoutParent } from './sidebar-context';
import CoarSidebarFlyoutPanel from './CoarSidebarFlyoutPanel.vue';

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

const slots = useSlots();

// Flyout state
const flyoutOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let openTimer: ReturnType<typeof setTimeout> | null = null;
let overlayRef: OverlayRef | null = null;

// Parent-child flyout cascade: inject parent's close control, provide our own for children
const parentFlyout = inject(SIDEBAR_FLYOUT_PARENT_KEY, null);

// This flyout's control — passed to children via SidebarFlyoutProvider inside the panel.
// `cancelClose`/`scheduleClose` cascade up so hovering a child flyout keeps ancestors open.
const selfControl: SidebarFlyoutParent = {
  cancelClose: () => {
    cancelClose();
    parentFlyout?.cancelClose();
  },
  scheduleClose: () => {
    scheduleClose();
    parentFlyout?.scheduleClose();
  },
};

// Nested flyout triggers inside icon-only parent should render as icon-only too
const renderIconOnly = computed(() => parentIconOnly.value && !sidebarCollapsed.value);

const tooltipConfig = computed(() => {
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
    if (flyoutOpen.value) closeFlyout();
    else openFlyout();
    return;
  }

  open.value = !open.value;
}

// --- overlay-service wiring ---

const parentOverlay = useOverlayParent();

function renderContent(): VNode[] | undefined {
  return slots.default?.();
}

function openFlyout() {
  if (!triggerRef.value || overlayRef) return;
  cancelClose();
  parentFlyout?.cancelClose(); // keep ancestor open while we open
  flyoutOpen.value = true;

  // Anchor is the trigger element, but the legacy positioning pinned the flyout's
  // horizontal edge to the *sidebar container*'s edge so the flyout lines up with the
  // sidebar rail (not the narrow icon trigger inside it). Collapsed sidebars typically
  // center a 36 px icon inside a 64 px rail — a trigger-anchored flyout would land
  // 14 px inside the rail on each side. Compensate by folding that gap into the offset:
  // right-start with `offset = baseOffset + gap` puts the flyout's left edge at
  // `trigger.right + (gap - 4)` = `container.right - 4`, matching the legacy visual.
  // For full-width triggers the gap is 0, so the offset stays -4 as the preset defined.
  const trigger = triggerRef.value;
  const triggerRect = trigger.getBoundingClientRect();
  const railEl = trigger.closest('.coar-sidebar') ?? trigger.closest('.coar-sidebar-flyout');
  const railRect = railEl?.getBoundingClientRect();
  const horizontalGap = railRect ? railRect.right - triggerRect.right : 0;
  const BASE_OFFSET = -4;

  const ref = getOverlayService().open({
    spec: {
      ...sidebarFlyoutPreset,
      anchor: { kind: 'element', element: trigger },
      position: {
        placement: ['right-start', 'left-start'],
        offset: BASE_OFFSET + horizontalGap,
        flip: true,
        shift: true,
      },
    },
    content: { kind: 'component', component: markRaw(CoarSidebarFlyoutPanel) },
    inputs: {
      id: panelId,
      label: props.label,
      iconOnly: resolvedIconOnly.value,
      parentControl: selfControl,
      renderContent,
      onFlyoutEnter: () => {
        cancelClose();
        parentFlyout?.cancelClose();
      },
      onFlyoutLeave: () => scheduleClose(),
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

  // Sync local state if the service closes externally (outside click, escape, parent
  // tree teardown). Skipped when our own `closeFlyout` already ran since it clears
  // `overlayRef` before calling `ref.close()`.
  ref.afterClosed.then(() => {
    if (overlayRef !== ref) return;
    overlayRef = null;
    flyoutOpen.value = false;
    cancelClose();
    cancelOpen();
  });
}

function closeFlyout() {
  cancelClose();
  flyoutOpen.value = false;
  const ref = overlayRef;
  overlayRef = null;
  if (ref && !ref.isClosed) ref.close();
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
  parentFlyout?.cancelClose(); // keep ancestor open when hovering our trigger
}

function onTriggerLeave() {
  cancelOpen();
  if (flyoutOpen.value) scheduleClose();
}

// Close flyout when sidebar collapsed state changes
watch(sidebarCollapsed, () => {
  if (flyoutOpen.value) closeFlyout();
});

onBeforeUnmount(() => {
  cancelClose();
  cancelOpen();
  if (overlayRef && !overlayRef.isClosed) overlayRef.close();
  overlayRef = null;
});
</script>

<template>
  <div
    class="coar-sidebar-group"
    :class="{
      'coar-sidebar-group--collapsed': sidebarCollapsed,
      'coar-sidebar-group--icon-only': renderIconOnly,
    }"
  >
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

.coar-sidebar-group--collapsed {
  margin-bottom: 0.25rem;
}

/* ========================================
   Icon-only mode (nested in icon-only flyout)
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

<!-- Flyout panel is service-mounted outside this component's scope, so styles are unscoped. -->
<style>
.coar-sidebar-flyout {
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

/* Icons mode: narrow layout */
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

.coar-sidebar-flyout--icons .coar-sidebar-flyout__items .coar-sidebar-group--icon-only .coar-sidebar-group__trigger {
  width: fit-content;
  margin: 0 auto;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
  justify-content: center;
}

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

/* Labels mode: override collapsed styles inside the flyout */
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
