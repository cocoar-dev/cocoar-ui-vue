<script setup lang="ts">
/**
 * Panel mounted by the overlay-service when `CoarPopover` opens. The service handles
 * teleport, positioning, z-index stacking, click-outside, and escape — this component
 * only renders the visual box and relays pointer events back to `CoarPopover` so its
 * hover-close-timer logic stays in one place.
 *
 * `renderContent` is a closure supplied by `CoarPopover.setup()` that re-invokes its
 * `content` slot. Passing it as a prop function lets the panel (mounted elsewhere in the
 * tree via the service) still render slot VNodes from the original component's scope.
 */
import { type VNode, type PropType } from 'vue';
import { vScrollbar } from '../scrollbar/vScrollbar';

defineProps({
  /** `false` turns off pointer events on the panel — used for tooltip-like variants. */
  interactive: { type: Boolean, default: true },
  /** Render function returning the content VNodes from the parent's `content` slot. */
  renderContent: {
    type: Function as PropType<() => VNode[] | undefined>,
    required: true,
  },
});

const emit = defineEmits<{
  panelEnter: [];
  panelLeave: [];
  panelFocusOut: [event: FocusEvent];
}>();
</script>

<template>
  <div
    class="coar-popover-panel"
    :class="{ 'coar-popover-panel--non-interactive': !interactive }"
    :role="interactive ? 'dialog' : 'tooltip'"
    @mouseenter="emit('panelEnter')"
    @mouseleave="emit('panelLeave')"
    @focusin="emit('panelEnter')"
    @focusout="(e: FocusEvent) => emit('panelFocusOut', e)"
  >
    <div v-scrollbar="{ overflowX: 'hidden', defer: false }" class="coar-popover-content">
      <component :is="{ render: renderContent }" />
    </div>
  </div>
</template>

<style scoped>
.coar-popover-panel {
  padding: var(--coar-spacing-s);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  min-width: var(--coar-popover-min-width);
  max-width: var(--coar-popover-max-width);
  pointer-events: auto;
}

.coar-popover-panel--non-interactive {
  pointer-events: none;
}

.coar-popover-content {
  max-height: var(--coar-popover-max-height);
  overflow: hidden;
}
</style>
