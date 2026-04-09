<script setup lang="ts">
/**
 * CoarSidebar: A three-part layout component for navigation sidebars.
 *
 * Provides three scoped slots (each receives `{ collapsed }`):
 * - #header: Fixed at top, for logo/title/branding
 * - default: Scrollable area for CoarSidebarItem / CoarSidebarGroup
 * - #footer: Fixed at bottom, for actions/settings/user info
 */
import { computed, provide, toRef } from 'vue';
import { vScrollbar } from '../scrollbar/vScrollbar';
import { SIDEBAR_COLLAPSED_KEY, SIDEBAR_ICON_SIZE_KEY } from './sidebar-context';

type SidebarVariant = 'primary' | 'secondary';
type SidebarSize = 's' | 'm' | 'l';

const props = withDefaults(
  defineProps<{
    /** Sidebar position: left or right side */
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
    position: 'left',
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

const collapsedRef = toRef(props, 'collapsed');
const sizeRef = toRef(props, 'size');
provide(SIDEBAR_COLLAPSED_KEY, collapsedRef);
provide(SIDEBAR_ICON_SIZE_KEY, sizeRef);

const hostClasses = computed(() => ({
  'coar-sidebar': true,
  [`coar-sidebar--${props.variant}`]: true,
  'coar-sidebar--collapsed': props.collapsed,
  'coar-sidebar--position-right': props.position === 'right',
  'coar-sidebar--elevated': props.elevated,
  'coar-sidebar--borderless': props.borderless,
}));
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

    <div v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave', defer: false }" class="coar-sidebar__content">
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
  flex-direction: column;
  height: 100%;

  width: var(--coar-sidebar-width);
  min-width: var(--coar-sidebar-min-width);
  max-width: var(--coar-sidebar-max-width);

  border-right: var(--coar-sidebar-border);
  overflow: hidden;
  transition:
    width var(--coar-duration-normal) var(--coar-ease-out),
    min-width var(--coar-duration-normal) var(--coar-ease-out),
    max-width var(--coar-duration-normal) var(--coar-ease-out),
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    border-color var(--coar-duration-normal) var(--coar-ease-out),
    box-shadow var(--coar-duration-normal) var(--coar-ease-out);
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

.coar-sidebar--position-right {
  border-right: none;
  border-left: var(--coar-sidebar-border);
}

.coar-sidebar--position-right.coar-sidebar--borderless {
  border-color: transparent;
}

.coar-sidebar--collapsed {
  width: var(--coar-sidebar-collapsed-width);
  min-width: var(--coar-sidebar-collapsed-width);
  max-width: var(--coar-sidebar-collapsed-width);
}

.coar-sidebar--collapsed .coar-sidebar__header,
.coar-sidebar--collapsed .coar-sidebar__footer {
  align-items: center;
}

.coar-sidebar__header,
.coar-sidebar__footer {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.coar-sidebar__header {
  padding: var(--coar-sidebar-header-padding);
}

.coar-sidebar__content {
  flex: 1;
  overflow: hidden;
  padding: var(--coar-sidebar-content-padding);
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
