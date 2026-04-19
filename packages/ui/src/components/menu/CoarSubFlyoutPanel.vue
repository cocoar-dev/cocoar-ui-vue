<script setup lang="ts">
/**
 * Panel mounted by the overlay-service when `CoarSubFlyout` opens its submenu. The
 * service handles teleport, positioning, z-index stacking, click-outside, and escape —
 * this component wraps the slot in a `CoarMenu` (for background / border / shadow and
 * an isolated roving-tabindex context for the submenu items) and re-provides the menu
 * cascade + close keys so nested items inside the slot still reach this SubFlyout's
 * close chain even though they're rendered under `CoarOverlayOutlet` rather than
 * directly under `CoarSubFlyout`.
 *
 * Mirrors the `CoarContextMenuPanel` approach: the visual container is always a
 * `CoarMenu`, so callers can write `<CoarSubFlyout><CoarMenuItem ... /></CoarSubFlyout>`
 * and get a styled submenu without having to wrap in an inner `CoarMenu` themselves.
 */
import { provide, type PropType, type VNode } from 'vue';
import {
  MENU_CASCADE_KEY,
  MENU_CLOSE_KEY,
  type MenuCascade,
} from './menu-cascade';
import CoarMenu from './CoarMenu.vue';

const props = defineProps({
  /** DOM id for the panel — referenced by the trigger's `aria-controls`. */
  id: { type: String, required: true },
  /** Render function returning the default-slot VNodes from the SubFlyout's scope. */
  renderContent: {
    type: Function as PropType<() => VNode[] | undefined>,
    required: true,
  },
  /** This SubFlyout's own cascade node — nested SubFlyouts use it as their parent. */
  cascade: { type: Object as PropType<MenuCascade>, required: true },
  /** Close-the-entire-menu-tree callback, provided so nested `CoarMenuItem` auto-closes. */
  closeTree: { type: Function as PropType<() => void>, required: true },
});

defineEmits<{
  panelEnter: [];
  panelLeave: [];
}>();

// Re-provide the menu inject chain that the SubFlyout's Vue-tree children would have
// had access to if this panel were rendered in-place. `CoarMenu` (below) provides its
// own `MENU_NAV_KEY`, so submenu items get an isolated roving-tabindex context — which
// is the expected cascading-menu keyboard behavior (ArrowDown cycles within the
// submenu instead of spilling into the parent menu's items).
provide(MENU_CASCADE_KEY, props.cascade);
provide(MENU_CLOSE_KEY, props.closeTree);
</script>

<template>
  <CoarMenu
    :id="id"
    class="coar-submenu-panel"
    @mouseenter="$emit('panelEnter')"
    @mouseleave="$emit('panelLeave')"
  >
    <component :is="{ render: renderContent }" />
  </CoarMenu>
</template>
