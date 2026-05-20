<script setup lang="ts">
import {
  computed, inject, onBeforeUnmount, ref, useId, useSlots, watch, markRaw,
  type VNode,
  type Slots,
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
  SIDEBAR_SIDE_KEY,
  orientationOf,
  type SidebarSide,
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
    /**
     * Split-trigger mode: clicking the trigger emits `triggerClick` instead
     * of toggling the panel. The flyout opens only via hover (`openOnHover`)
     * or programmatically via `v-model:open`. Use when the trigger represents
     * a primary action (e.g. "activate marker tool") and the panel offers
     * secondary configuration (stroke width, color). Only meaningful with
     * `mode="flyout"`; ignored for `mode="expand"`.
     */
    splitTrigger?: boolean;
    /**
     * Visual "selected" state for the trigger — matches `CoarSidebarItem`'s
     * `active` prop styling. Typically driven by the consumer to indicate
     * that the tool this group represents is currently the active one.
     */
    active?: boolean;
  }>(),
  {
    icon: undefined,
    disabled: false,
    mode: 'expand',
    iconOnly: undefined,
    openOnHover: false,
    splitTrigger: false,
    active: false,
  },
);

const emit = defineEmits<{
  /**
   * Trigger-area click in split-trigger mode. Only fires when
   * `splitTrigger` is true; consumers wire it to the primary action that
   * the trigger represents (e.g. activate the tool whose config the flyout
   * exposes).
   */
  triggerClick: [event: MouseEvent];
}>();

const open = defineModel<boolean>('open', { default: false });
const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
const sidebarIconSize = inject(SIDEBAR_ICON_SIZE_KEY, ref<CoarIconSize>('m'));
const sidebarSide = inject(SIDEBAR_SIDE_KEY, ref<SidebarSide>('left'));
const orientation = computed(() => orientationOf(sidebarSide.value));

// Inherit iconOnly from parent flyout if not explicitly set
const parentIconOnly = inject(SIDEBAR_FLYOUT_ICON_ONLY_KEY, ref(false));
const resolvedIconOnly = computed(() => props.iconOnly ?? parentIconOnly.value);

const isOpen = computed(() => open.value);
const isFlyout = computed(() => props.mode === 'flyout');

const slots: Slots = useSlots();

// Flyout state
const flyoutOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let openTimer: ReturnType<typeof setTimeout> | null = null;
let overlayRef: OverlayRef | null = null;

const parentFlyout = inject(SIDEBAR_FLYOUT_PARENT_KEY, null);

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

const renderIconOnly = computed(() => parentIconOnly.value && !sidebarCollapsed.value);

const tooltipPlacement = computed<'left' | 'right' | 'top' | 'bottom'>(() => {
  switch (sidebarSide.value) {
    case 'right': return 'left';
    case 'top': return 'bottom';
    case 'bottom': return 'top';
    default: return 'right';
  }
});

const tooltipConfig = computed(() => {
  if (renderIconOnly.value) {
    if (isFlyout.value && flyoutOpen.value) return false;
    if (!isFlyout.value && isOpen.value) return false;
    return { content: props.label, placement: tooltipPlacement.value, openDelay: 100 };
  }
  if (!sidebarCollapsed.value) return false;
  if (isFlyout.value && flyoutOpen.value) return false;
  return { content: props.label, placement: tooltipPlacement.value, openDelay: 200 };
});

// Indicator chevrons rotate with the side so closed-state always points toward
// the direction the panel will open in.
const closedChevron = computed(() => {
  switch (sidebarSide.value) {
    case 'right': return 'chevron-left';
    case 'top': return 'chevron-down';
    case 'bottom': return 'chevron-up';
    default: return 'chevron-right';
  }
});

const openChevron = computed(() => {
  // For horizontal sidebars, opposite-direction chevron makes "collapse" intuitive.
  // For vertical sidebars we keep the legacy chevron-down (familiar pattern).
  if (orientation.value === 'horizontal') {
    return sidebarSide.value === 'top' ? 'chevron-up' : 'chevron-down';
  }
  return 'chevron-down';
});

function toggle(event: Event) {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Split-trigger: clicking the trigger area fires the primary action; the
  // flyout stays hover-controlled. Only relevant for `mode="flyout"`.
  if (props.splitTrigger && isFlyout.value) {
    emit('triggerClick', event as MouseEvent);
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

// Pair of placements (primary + flip) keyed by side. The overlay engine's `flip`
// already handles viewport edges; we still pre-seed the alternative so a left-side
// flyout near the right viewport edge prefers the equally-valid 'left-start'.
const flyoutPlacement = computed<[string, string]>(() => {
  switch (sidebarSide.value) {
    case 'right': return ['left-start', 'right-start'];
    case 'top': return ['bottom-start', 'top-start'];
    case 'bottom': return ['top-start', 'bottom-start'];
    default: return ['right-start', 'left-start'];
  }
});

/**
 * Cross-axis gap between the trigger and the rail's outer edge along the axis the
 * flyout opens. Collapsed sidebars typically center a 36 px icon trigger inside a
 * 64 px rail — without this compensation, a trigger-anchored flyout would land
 * inside the rail. We add the gap to the offset so the flyout's leading edge lines
 * up with the rail's outer edge instead of the trigger's edge.
 */
function computeRailGap(trigger: HTMLElement): number {
  const triggerRect = trigger.getBoundingClientRect();
  const railEl = trigger.closest('.coar-sidebar') ?? trigger.closest('.coar-sidebar-flyout');
  if (!railEl) return 0;
  const railRect = railEl.getBoundingClientRect();
  switch (sidebarSide.value) {
    case 'right': return triggerRect.left - railRect.left;
    case 'top': return railRect.bottom - triggerRect.bottom;
    case 'bottom': return triggerRect.top - railRect.top;
    default: return railRect.right - triggerRect.right;
  }
}

function openFlyout() {
  if (!triggerRef.value || overlayRef) return;
  cancelClose();
  parentFlyout?.cancelClose();
  flyoutOpen.value = true;

  const trigger = triggerRef.value;
  const railGap = computeRailGap(trigger);
  const BASE_OFFSET = -4;

  const ref = getOverlayService().open({
    spec: {
      ...sidebarFlyoutPreset,
      anchor: { kind: 'element', element: trigger },
      position: {
        placement: flyoutPlacement.value as never,
        offset: BASE_OFFSET + railGap,
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
  parentFlyout?.cancelClose();
}

function onTriggerLeave() {
  cancelOpen();
  if (flyoutOpen.value) scheduleClose();
}

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
    :class="[
      `coar-sidebar-group--${orientation}`,
      `coar-sidebar-group--side-${sidebarSide}`,
      {
        'coar-sidebar-group--collapsed': sidebarCollapsed,
        'coar-sidebar-group--icon-only': renderIconOnly,
        'coar-sidebar-group--active': props.active,
      },
    ]"
  >
    <!-- Trigger -->
    <div
      ref="triggerRef"
      v-tooltip="tooltipConfig"
      class="coar-sidebar-group__trigger"
      :class="{
        'coar-sidebar-group__trigger--disabled': props.disabled,
        'coar-sidebar-group__trigger--open': isFlyout ? flyoutOpen : isOpen,
        'coar-sidebar-group__trigger--active': props.active,
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
              ? (flyoutOpen ? openChevron : closedChevron)
              : (isOpen ? 'minus' : 'plus')"
            size="xs"
          />
        </span>
      </span>
      <span class="coar-sidebar-group__label">{{ props.label }}</span>
      <CoarIcon
        :name="isFlyout
          ? (flyoutOpen ? openChevron : closedChevron)
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
.coar-sidebar-group {
  display: flex;
}

.coar-sidebar-group--vertical {
  flex-direction: column;
}

.coar-sidebar-group--horizontal {
  flex-direction: row;
  align-items: center;
}

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

.coar-sidebar-group--horizontal .coar-sidebar-group__trigger {
  width: auto;
  margin: var(--coar-sidebar-item-margin-horizontal, 0 2px);
  flex-shrink: 0;
}

/* The whole group (trigger + expand panel) must not shrink either, otherwise
   neighbours along the main axis would compress before the row overflows. */
.coar-sidebar-group--horizontal {
  flex-shrink: 0;
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

/* Active — mirrors CoarSidebarItem's `--active` styling so a group used as
   a primary tool toggle (`splitTrigger` + `active`) reads identically to a
   regular sidebar item in the selected state. The side-keyed indicator
   border matches the same pattern.

   `!important` not needed here because the group's own styling is the only
   competing source; for CoarSidebarItem we needed it (consumer's child CSS
   outranked our parent override). */
.coar-sidebar-group__trigger--active {
  color: var(--coar-sidebar-item-active-color, var(--coar-text-accent-primary));
  background: var(--coar-sidebar-item-active-bg, var(--coar-background-accent-tertiary));
  font-weight: var(--coar-font-weight-medium);
}
.coar-sidebar-group__trigger--active:hover {
  background: var(--coar-sidebar-item-active-bg, var(--coar-background-accent-tertiary));
}
.coar-sidebar-group--side-left .coar-sidebar-group__trigger--active {
  border-left: 3px solid currentColor;
  padding-left: calc(0.75rem - 3px);
}
.coar-sidebar-group--side-right .coar-sidebar-group__trigger--active {
  border-right: 3px solid currentColor;
  padding-right: calc(0.75rem - 3px);
}
.coar-sidebar-group--side-top .coar-sidebar-group__trigger--active {
  border-top: 3px solid currentColor;
  padding-top: calc(0.5rem - 3px);
}
.coar-sidebar-group--side-bottom .coar-sidebar-group__trigger--active {
  border-bottom: 3px solid currentColor;
  padding-bottom: calc(0.5rem - 3px);
}
/* Collapsed (icon-only) drops the indicator border and re-pads symmetrically. */
.coar-sidebar-group--collapsed .coar-sidebar-group__trigger--active,
.coar-sidebar-group--icon-only .coar-sidebar-group__trigger--active {
  border: none;
  padding: 0.5rem;
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


/* ========================================
   Expandable panel — vertical (animates height)
   ======================================== */

.coar-sidebar-group--vertical .coar-sidebar-group__panel {
  box-sizing: border-box;
  padding-left: var(--coar-sidebar-group-indent, 16px);
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-sidebar-group--vertical .coar-sidebar-group__panel--open {
  grid-template-rows: 1fr;
}

.coar-sidebar-group--vertical .coar-sidebar-group__panel-inner {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity var(--coar-duration-fast) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sidebar-group--vertical .coar-sidebar-group__panel--open > .coar-sidebar-group__panel-inner {
  opacity: 1;
  transform: translateY(0);
}

/* ========================================
   Expandable panel — horizontal (animates width)
   ======================================== */

.coar-sidebar-group--horizontal .coar-sidebar-group__panel {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 0fr;
  overflow: hidden;
  transition: grid-template-columns var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-sidebar-group--horizontal .coar-sidebar-group__panel--open {
  grid-template-columns: 1fr;
}

.coar-sidebar-group--horizontal .coar-sidebar-group__panel-inner {
  overflow: hidden;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  opacity: 0;
  transform: translateX(-2px);
  transition:
    opacity var(--coar-duration-fast) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-sidebar-group--horizontal
  .coar-sidebar-group__panel--open
  > .coar-sidebar-group__panel-inner {
  opacity: 1;
  transform: translateX(0);
}

/* ========================================
   Nested visual hierarchy — always on
   ========================================
   Children of an expanded group read as nested regardless of orientation or
   collapsed state: the icon shrinks and dims, and item padding tightens. The
   collapsed-rail rules below override these with stronger values where the
   item becomes an icon-only button. */

.coar-sidebar-group__panel :deep(.coar-sidebar-item) {
  padding: 0.375rem 0.625rem;
  font-size: var(--coar-component-s-font-size);
}

/* Apply opacity to the icon and label individually rather than the whole item,
   so the hover/focus background stays at full strength when the user points at
   a child. The visible fade is what makes children read as nested. */
.coar-sidebar-group__panel :deep(.coar-sidebar-item__icon) {
  transform: scale(0.85);
  opacity: 0.55;
}

.coar-sidebar-group__panel :deep(.coar-sidebar-item__label) {
  opacity: 0.65;
}

/* ========================================
   Collapsed mode (vertical sidebar)
   ======================================== */

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed .coar-sidebar-group__trigger {
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed .coar-sidebar-group__label {
  display: none;
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed .coar-sidebar-group__caret {
  display: flex;
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed .coar-sidebar-group__chevron {
  display: none;
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed .coar-sidebar-group__panel {
  --coar-sidebar-group-indent: 0;
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed
  .coar-sidebar-group__panel
  :deep(.coar-sidebar-item) {
  padding: 0.25rem 0.375rem;
  margin-left: auto;
  margin-right: auto;
}

/* Stronger shrink than the always-on rule — fits the icon-only button. */
.coar-sidebar-group--vertical.coar-sidebar-group--collapsed
  .coar-sidebar-group__panel
  :deep(.coar-sidebar-item__icon) {
  transform: scale(0.75);
}

.coar-sidebar-group--vertical.coar-sidebar-group--collapsed {
  margin-bottom: 0.25rem;
}

/* ========================================
   Collapsed mode (horizontal sidebar)
   ======================================== */

.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed .coar-sidebar-group__trigger {
  height: fit-content;
  margin-top: auto;
  margin-bottom: auto;
  justify-content: center;
  padding: 0.5rem;
  border-radius: var(--coar-radius-s);
}

.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed .coar-sidebar-group__label {
  display: none;
}

.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed .coar-sidebar-group__caret {
  display: flex;
}

.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed .coar-sidebar-group__chevron {
  display: none;
}

/* Mirror the vertical collapsed-rail visual hierarchy: child items inside an
   expanded group render smaller and dimmed so they read as nested. The vertical
   rules use auto-margins on the cross axis for centering — flip those to the
   horizontal cross axis here. */
.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed
  .coar-sidebar-group__panel
  :deep(.coar-sidebar-item) {
  padding: 0.25rem 0.375rem;
  margin-top: auto;
  margin-bottom: auto;
}

/* Stronger shrink than the always-on rule — fits the icon-only button. */
.coar-sidebar-group--horizontal.coar-sidebar-group--collapsed
  .coar-sidebar-group__panel
  :deep(.coar-sidebar-item__icon) {
  transform: scale(0.75);
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
