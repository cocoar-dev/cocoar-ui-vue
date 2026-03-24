<script setup lang="ts">
/**
 * CoarSidebar: A three-part layout component for navigation sidebars.
 *
 * Provides three slots:
 * - #header: Fixed at top, for logo/title/branding
 * - default: Scrollable area for navigation menu or other content
 * - #footer: Fixed at bottom, for actions/settings/user info
 */
import { computed } from 'vue';
import { vScrollbar } from '../scrollbar/vScrollbar';

type SidebarVariant = 'primary' | 'secondary';

const props = withDefaults(
  defineProps<{
    /** Sidebar position: left or right side */
    position?: 'left' | 'right';
    /** Collapsed state for narrow/icon-only sidebar */
    collapsed?: boolean;
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
    variant: 'primary',
    elevated: false,
    borderless: false,
    ariaLabel: undefined,
  },
);

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
      <slot name="header" />
    </div>

    <div v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave', defer: false }" class="coar-sidebar__content">
      <slot />
    </div>

    <div v-if="$slots.footer" class="coar-sidebar__footer">
      <slot name="footer" />
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
  transition:
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    border-color var(--coar-duration-normal) var(--coar-ease-out),
    box-shadow var(--coar-duration-normal) var(--coar-ease-out);

  /* Menu styling overrides for sidebar context */
  --coar-menu-heading-font-size: var(--coar-font-size-xs);
  --coar-menu-heading-spacing-top: var(--coar-spacing-l);
  --coar-menu-item-border-radius: var(--coar-radius-xxs);
  --coar-menu-item-margin: var(--coar-spacing-3xs) 0;
  --coar-menu-item-background-hover: var(--coar-background-neutral-tertiary);
  --coar-menu-item-background-focus: var(--coar-background-neutral-tertiary);
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

/* Make menu stretch full width inside sidebar */
.coar-sidebar :deep(.coar-menu) {
  display: flex;
  min-width: unset;
  max-width: unset;
  width: 100%;
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
}

.coar-sidebar--collapsed .coar-sidebar__header,
.coar-sidebar--collapsed .coar-sidebar__content,
.coar-sidebar--collapsed .coar-sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.coar-sidebar__header {
  flex-shrink: 0;
}

.coar-sidebar__content {
  flex: 1;
  overflow: hidden;
  padding: var(--coar-sidebar-content-padding);
}

.coar-sidebar__footer {
  flex-shrink: 0;
}
</style>
