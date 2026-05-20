<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_SIDE_KEY,
  orientationOf,
  type SidebarSide,
} from './sidebar-context';

const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
const sidebarSide = inject(SIDEBAR_SIDE_KEY, ref<SidebarSide>('left'));
const orientation = computed(() => orientationOf(sidebarSide.value));
</script>

<template>
  <div
    class="coar-sidebar-divider"
    :class="[
      `coar-sidebar-divider--${orientation}`,
      { 'coar-sidebar-divider--collapsed': sidebarCollapsed },
    ]"
    role="separator"
    :aria-orientation="orientation === 'horizontal' ? 'vertical' : 'horizontal'"
  />
</template>

<style scoped>
/* The divider is a single 1px line with margins on both axes:
   - "along" axis (the one parallel to the sidebar's item flow)
     controls the gap between the divider and the items it separates.
     Constant across orientations to keep item spacing visually identical.
   - "across" axis (the one perpendicular to the item flow) controls
     how far the line is inset from the rail's outer edges. Larger in
     expanded mode so the line doesn't visually crowd labels, tighter
     in collapsed mode so it fits a square icon-only rail.
   The vertical/horizontal cases are 90°-mirror images of each other. */
.coar-sidebar-divider {
  background: var(--coar-border-neutral-tertiary);
  flex-shrink: 0;
}

/* Vertical sidebar → horizontal divider line spanning the rail's width.
     along = top/bottom (xs)   across = left/right (s expanded, 3xs collapsed) */
.coar-sidebar-divider--vertical {
  height: 1px;
  margin: var(--coar-spacing-xs) var(--coar-spacing-s);
}
.coar-sidebar-divider--vertical.coar-sidebar-divider--collapsed {
  margin: var(--coar-spacing-xs) var(--coar-spacing-3xs);
}

/* Horizontal sidebar (top/bottom) → vertical divider line between items.
     along = left/right (xs)   across = top/bottom (s expanded, 3xs collapsed) */
.coar-sidebar-divider--horizontal {
  width: 1px;
  align-self: stretch;
  margin: var(--coar-spacing-s) var(--coar-spacing-xs);
}
.coar-sidebar-divider--horizontal.coar-sidebar-divider--collapsed {
  margin: var(--coar-spacing-3xs) var(--coar-spacing-xs);
}
</style>
