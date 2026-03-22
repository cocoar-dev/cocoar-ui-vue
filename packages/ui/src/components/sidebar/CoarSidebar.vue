<script setup lang="ts">
/**
 * CoarSidebar: A three-part layout component for navigation sidebars.
 *
 * Provides three slots:
 * - #header: Fixed at top, for logo/title/branding
 * - default: Scrollable area for navigation menu or other content
 * - #footer: Fixed at bottom, for actions/settings/user info
 */
import { vScrollbar } from '../scrollbar/vScrollbar';

withDefaults(
  defineProps<{
    /** Sidebar position: left or right side */
    position?: 'left' | 'right';
    /** Collapsed state for narrow/icon-only sidebar */
    collapsed?: boolean;
    /** Accessible label for the sidebar landmark */
    ariaLabel?: string;
  }>(),
  {
    position: 'left',
    collapsed: false,
    ariaLabel: undefined,
  },
);
</script>

<template>
  <aside
    class="coar-sidebar"
    role="navigation"
    :aria-label="ariaLabel || 'Sidebar'"
    :class="{
      'coar-sidebar--collapsed': collapsed,
      'coar-sidebar--position-right': position === 'right',
    }"
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

  background: var(--coar-sidebar-background);
  border-right: var(--coar-sidebar-border);

  /* Menu styling overrides for sidebar context */
  --coar-menu-heading-font-size: var(--coar-font-size-xs);
  --coar-menu-heading-spacing-top: var(--coar-spacing-l);
  --coar-menu-item-border-radius: var(--coar-radius-xxs);
  --coar-menu-item-margin: var(--coar-spacing-3xs) 0;
  --coar-menu-item-background-hover: var(--coar-background-neutral-tertiary);
  --coar-menu-item-background-focus: var(--coar-background-neutral-tertiary);
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
