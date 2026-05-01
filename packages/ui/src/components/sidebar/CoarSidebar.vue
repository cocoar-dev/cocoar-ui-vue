<script setup lang="ts">
/**
 * CoarSidebar: A three-part layout component for navigation sidebars.
 *
 * Provides three scoped slots (each receives `{ collapsed }`):
 * - #header: Fixed at start of main axis (top in vertical sidebars, left in horizontal)
 * - default: Scrollable area for CoarSidebarItem / CoarSidebarGroup
 * - #footer: Fixed at end of main axis
 */
import { computed, provide, toRef } from 'vue';
import { vScrollbar } from '../scrollbar/vScrollbar';
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_ICON_SIZE_KEY,
  SIDEBAR_SIDE_KEY,
  orientationOf,
  type SidebarSide,
} from './sidebar-context';

type SidebarVariant = 'primary' | 'secondary';
type SidebarSize = 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    /** Sidebar side. Replaces `position`; `position` is still accepted as an alias. */
    side?: SidebarSide;
    /** @deprecated use `side` instead. */
    position?: 'left' | 'right';
    /** Collapsed state for narrow/icon-only sidebar */
    collapsed?: boolean;
    /** Icon and item size: 's' (16px), 'm' (20px), 'l' (24px) */
    size?: SidebarSize;
    /** Background variant */
    variant?: SidebarVariant;
    /** Whether to show elevation shadow */
    elevated?: boolean;
    /** Hide the border */
    borderless?: boolean;
    /** Accessible label for the sidebar landmark */
    ariaLabel?: string;
  }>(),
  {
    side: undefined,
    position: undefined,
    collapsed: false,
    size: 'm',
    variant: 'primary',
    elevated: false,
    borderless: false,
    ariaLabel: undefined,
  },
);

defineEmits<{
  'update:collapsed': [value: boolean];
}>();

const resolvedSide = computed<SidebarSide>(() => props.side ?? props.position ?? 'left');
const orientation = computed(() => orientationOf(resolvedSide.value));

const collapsedRef = toRef(props, 'collapsed');
const sizeRef = toRef(props, 'size');
provide(SIDEBAR_COLLAPSED_KEY, collapsedRef);
provide(SIDEBAR_ICON_SIZE_KEY, sizeRef);
provide(SIDEBAR_SIDE_KEY, resolvedSide);

const hostClasses = computed(() => ({
  'coar-sidebar': true,
  [`coar-sidebar--${props.variant}`]: true,
  [`coar-sidebar--side-${resolvedSide.value}`]: true,
  [`coar-sidebar--${orientation.value}`]: true,
  [`coar-sidebar--size-${props.size}`]: true,
  'coar-sidebar--collapsed': props.collapsed,
  'coar-sidebar--elevated': props.elevated,
  'coar-sidebar--borderless': props.borderless,
}));

// Scrollbar axis flips with orientation: vertical sidebar scrolls vertically,
// horizontal sidebar scrolls horizontally.
const scrollbarOptions = computed(() =>
  orientation.value === 'vertical'
    ? { overflowX: 'hidden' as const, autoHide: 'leave' as const, defer: false }
    : { overflowY: 'hidden' as const, autoHide: 'leave' as const, defer: false },
);
</script>

<template>
  <aside
    role="navigation"
    :aria-label="ariaLabel || 'Sidebar'"
    :class="hostClasses"
  >
    <div v-if="$slots.header" class="coar-sidebar__header">
      <slot name="header" :collapsed="props.collapsed" />
    </div>

    <div v-scrollbar="scrollbarOptions" class="coar-sidebar__content">
      <slot :collapsed="props.collapsed" />
    </div>

    <div v-if="$slots.footer" class="coar-sidebar__footer">
      <slot name="footer" :collapsed="props.collapsed" />
    </div>
  </aside>
</template>

<style scoped>
.coar-sidebar {
  display: flex;
  box-sizing: border-box;
  overflow: hidden;
  transition:
    width var(--coar-duration-normal) var(--coar-ease-out),
    min-width var(--coar-duration-normal) var(--coar-ease-out),
    max-width var(--coar-duration-normal) var(--coar-ease-out),
    height var(--coar-duration-normal) var(--coar-ease-out),
    min-height var(--coar-duration-normal) var(--coar-ease-out),
    max-height var(--coar-duration-normal) var(--coar-ease-out),
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    border-color var(--coar-duration-normal) var(--coar-ease-out),
    box-shadow var(--coar-duration-normal) var(--coar-ease-out);
}

/* ========================================
   Orientation: vertical (left / right)
   ======================================== */

.coar-sidebar--vertical {
  flex-direction: column;
  height: 100%;
  width: var(--coar-sidebar-width);
  min-width: var(--coar-sidebar-min-width);
  max-width: var(--coar-sidebar-max-width);
}

/* Collapsed rail width scales with `size` by default. Setting
   `--coar-sidebar-collapsed-width` (anywhere in the cascade) overrides the
   per-size fallback because the variable becomes defined and `var()` returns
   the inherited value instead of the literal fallback. */
.coar-sidebar--vertical.coar-sidebar--collapsed.coar-sidebar--size-s {
  width: var(--coar-sidebar-collapsed-width, 2.25rem);
  min-width: var(--coar-sidebar-collapsed-width, 2.25rem);
  max-width: var(--coar-sidebar-collapsed-width, 2.25rem);
}

.coar-sidebar--vertical.coar-sidebar--collapsed.coar-sidebar--size-m {
  width: var(--coar-sidebar-collapsed-width, 2.75rem);
  min-width: var(--coar-sidebar-collapsed-width, 2.75rem);
  max-width: var(--coar-sidebar-collapsed-width, 2.75rem);
}

.coar-sidebar--vertical.coar-sidebar--collapsed.coar-sidebar--size-l {
  width: var(--coar-sidebar-collapsed-width, 3.25rem);
  min-width: var(--coar-sidebar-collapsed-width, 3.25rem);
  max-width: var(--coar-sidebar-collapsed-width, 3.25rem);
}

.coar-sidebar--side-left {
  border-right: var(--coar-sidebar-border);
}

.coar-sidebar--side-right {
  border-left: var(--coar-sidebar-border);
}

/* ========================================
   Orientation: horizontal (top / bottom)
   ======================================== */

.coar-sidebar--horizontal {
  flex-direction: row;
  width: 100%;
  height: var(--coar-sidebar-height, auto);
  min-height: var(--coar-sidebar-min-height, auto);
  max-height: var(--coar-sidebar-max-height, none);
}

/* Symmetric per-size collapsed height for horizontal sidebars. */
.coar-sidebar--horizontal.coar-sidebar--collapsed.coar-sidebar--size-s {
  height: var(--coar-sidebar-collapsed-height, 2.25rem);
  min-height: var(--coar-sidebar-collapsed-height, 2.25rem);
  max-height: var(--coar-sidebar-collapsed-height, 2.25rem);
}

.coar-sidebar--horizontal.coar-sidebar--collapsed.coar-sidebar--size-m {
  height: var(--coar-sidebar-collapsed-height, 2.75rem);
  min-height: var(--coar-sidebar-collapsed-height, 2.75rem);
  max-height: var(--coar-sidebar-collapsed-height, 2.75rem);
}

.coar-sidebar--horizontal.coar-sidebar--collapsed.coar-sidebar--size-l {
  height: var(--coar-sidebar-collapsed-height, 3.25rem);
  min-height: var(--coar-sidebar-collapsed-height, 3.25rem);
  max-height: var(--coar-sidebar-collapsed-height, 3.25rem);
}

.coar-sidebar--side-top {
  border-bottom: var(--coar-sidebar-border);
}

.coar-sidebar--side-bottom {
  border-top: var(--coar-sidebar-border);
}

/* Variants */
.coar-sidebar--primary {
  background-color: var(--coar-background-neutral-secondary);
}

.coar-sidebar--secondary {
  background-color: var(--coar-background-neutral-primary);
}

/* Elevated */
.coar-sidebar--elevated {
  box-shadow: var(--coar-elevation-medium);
}

/* Borderless */
.coar-sidebar--borderless {
  border-color: transparent;
}

/* Collapsed: center children on the cross-axis (already centred along main axis
   inside item/group via fit-content + auto margins). */
.coar-sidebar--vertical.coar-sidebar--collapsed .coar-sidebar__header,
.coar-sidebar--vertical.coar-sidebar--collapsed .coar-sidebar__footer {
  align-items: center;
}

.coar-sidebar--horizontal.coar-sidebar--collapsed .coar-sidebar__header,
.coar-sidebar--horizontal.coar-sidebar--collapsed .coar-sidebar__footer {
  justify-content: center;
}

.coar-sidebar__header,
.coar-sidebar__footer {
  display: flex;
  flex-shrink: 0;
}

.coar-sidebar--vertical .coar-sidebar__header,
.coar-sidebar--vertical .coar-sidebar__footer {
  flex-direction: column;
}

.coar-sidebar--horizontal .coar-sidebar__header,
.coar-sidebar--horizontal .coar-sidebar__footer {
  flex-direction: row;
  align-items: center;
}

.coar-sidebar__header {
  padding: var(--coar-sidebar-header-padding);
}

.coar-sidebar__content {
  flex: 1;
  overflow: hidden;
  padding: var(--coar-sidebar-content-padding);
}

/* OverlayScrollbars wraps the slot content in a viewport element; for a
   horizontal sidebar the viewport itself must become the flex-row container
   so items lay out side-by-side, not inside a default block-flow wrapper. */
.coar-sidebar--horizontal .coar-sidebar__content :deep([data-overlayscrollbars-viewport]) {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  height: 100%;
}

.coar-sidebar__footer {
  padding: var(--coar-sidebar-footer-padding);
}

@media (prefers-reduced-motion: reduce) {
  .coar-sidebar {
    transition-duration: 0s;
  }
}
</style>
