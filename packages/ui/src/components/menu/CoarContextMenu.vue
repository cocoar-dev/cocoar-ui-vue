<script setup lang="ts">
/**
 * Right-click / programmatic context-menu trigger. Watches the controller returned from
 * `useContextMenu()` and opens an overlay via the overlay-service each time `isOpen`
 * flips true. The menu is anchored at the recorded cursor position.
 *
 * The component itself is renderless — all visual markup lives in `CoarContextMenuPanel`,
 * which the service mounts under `CoarOverlayOutlet`. This gives us z-index stacking,
 * scroll-close, escape, and tree-aware outside-click for free. When this context menu is
 * opened from inside another overlay (dialog, popover, etc.), `useOverlayParent()` picks
 * up the parent instance and the service stacks above it and treats clicks inside the
 * context menu as clicks inside the parent tree.
 */
import { watch, useSlots, markRaw, onBeforeUnmount, type VNode, type Slots } from 'vue';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { contextMenuPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import type { ContextMenuContext } from './useContextMenu';
import CoarContextMenuPanel from './CoarContextMenuPanel.vue';

const props = defineProps<{
  /** Context menu controller returned by useContextMenu() */
  menu: ContextMenuContext;
}>();

const slots: Slots = useSlots();
const parentOverlay = useOverlayParent();

let overlayRef: OverlayRef | null = null;

function renderContent(): VNode[] | undefined {
  return slots.default?.();
}

function openOverlay() {
  if (overlayRef && !overlayRef.isClosed) return;

  const pos = props.menu.position.value;

  const ref = getOverlayService().open({
    spec: {
      ...contextMenuPreset,
      anchor: { kind: 'point', x: pos.x, y: pos.y },
    },
    content: { kind: 'component', component: markRaw(CoarContextMenuPanel) },
    inputs: {
      renderContent,
      closeMenu: () => props.menu.close(),
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

  // Sync controller state when the service closes the overlay externally — otherwise
  // `menu.isOpen.value` would stay true and the next right-click would no-op on the
  // `overlayRef && !overlayRef.isClosed` guard above.
  ref.afterClosed.then(() => {
    if (overlayRef === ref) overlayRef = null;
    if (props.menu.isOpen.value) props.menu.close();
  });
}

function closeOverlay() {
  const ref = overlayRef;
  overlayRef = null;
  if (ref && !ref.isClosed) ref.close();
}

watch(
  () => props.menu.isOpen.value,
  (open) => {
    if (open) openOverlay();
    else closeOverlay();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  closeOverlay();
});
</script>

<script lang="ts">
// Renderless — the context menu is fully service-rendered via CoarOverlayOutlet.
// Declare an explicit empty render function so the SFC has a valid render target
// without forcing an invisible DOM node into every caller's tree.
export default { render: () => null };
</script>
