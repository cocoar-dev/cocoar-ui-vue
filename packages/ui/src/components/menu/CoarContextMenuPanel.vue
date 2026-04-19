<script setup lang="ts">
/**
 * Panel mounted by the overlay-service when `CoarContextMenu` opens. Wraps the user's
 * slot in a `CoarMenu` (which supplies roving-tabindex and the cascade root) and
 * re-provides `MENU_CLOSE_KEY` so nested `CoarMenuItem`s auto-close the entire menu
 * tree when clicked. The service handles teleport, positioning, scroll-close, outside
 * click, and escape — none of that lives in the component anymore.
 */
import { type PropType, type VNode } from 'vue';
import { provideMenuClose } from './menu-cascade';
import CoarMenu from './CoarMenu.vue';

const props = defineProps({
  /** Render function returning the default-slot VNodes from the ContextMenu's scope. */
  renderContent: {
    type: Function as PropType<() => VNode[] | undefined>,
    required: true,
  },
  /** Callback the service-mounted menu uses to close the context-menu state. */
  closeMenu: { type: Function as PropType<() => void>, required: true },
});

// Menu items inside this tree close the context menu via `useMenuClose()`. The close
// function must be re-provided here because the service mounts this panel outside the
// original `CoarContextMenu` component subtree.
provideMenuClose(() => props.closeMenu());
</script>

<template>
  <CoarMenu>
    <component :is="{ render: renderContent }" />
  </CoarMenu>
</template>
