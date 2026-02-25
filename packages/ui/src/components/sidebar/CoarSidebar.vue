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
  }>(),
  {
    position: 'left',
    collapsed: false,
  },
);
</script>

<template>
  <aside
    class="coar-sidebar"
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

  width: var(--coar-sidebar-width, 16rem);
  min-width: var(--coar-sidebar-min-width, 12rem);
  max-width: var(--coar-sidebar-max-width, 20rem);

  background: var(--coar-sidebar-background, var(--coar-background-neutral-primary, #ffffff));
  border-right: var(--coar-sidebar-border, 1px solid var(--coar-border-neutral-tertiary, #e5e5e5));

  /* Menu styling overrides for sidebar context */
  --coar-menu-heading-font-size: var(--coar-font-size-xs, 12px);
  --coar-menu-heading-spacing-top: var(--coar-spacing-l, 16px);
  --coar-menu-item-border-radius: var(--coar-radius-xxs);
  --coar-menu-item-margin: var(--coar-spacing-3xs, 2px) 0;
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
  border-left: var(--coar-sidebar-border, 1px solid var(--coar-border-neutral-tertiary, #e5e5e5));
}

.coar-sidebar--collapsed {
  width: var(--coar-sidebar-collapsed-width, 4rem);
  min-width: var(--coar-sidebar-collapsed-width, 4rem);
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
  padding: var(--coar-sidebar-content-padding, 0);
}

.coar-sidebar__footer {
  flex-shrink: 0;
}
</style>
