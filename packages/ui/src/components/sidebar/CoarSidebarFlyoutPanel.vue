<script setup lang="ts">
/**
 * Panel mounted by the overlay-service when a `CoarSidebarGroup` in `mode="flyout"`
 * opens. The service handles teleport, positioning, z-index stacking, click-outside,
 * and escape — this component wraps the content in `SidebarFlyoutProvider` (which
 * provides `SIDEBAR_FLYOUT_ICON_ONLY_KEY` and `SIDEBAR_FLYOUT_PARENT_KEY` so nested
 * `CoarSidebarGroup`s inside the slot can inherit icon-only mode and cooperate with
 * the parent's hover-close timers).
 *
 * Mouse-enter/leave on the visible flyout container are relayed to the owning
 * `CoarSidebarGroup` via `onFlyoutEnter` / `onFlyoutLeave` inputs so its close-timer
 * logic stays in one place.
 */
import { type PropType, type VNode } from 'vue';
import SidebarFlyoutProvider from './SidebarFlyoutProvider.vue';
import type { SidebarFlyoutParent } from './sidebar-context';

defineProps({
  /** DOM id for the panel — referenced by the trigger's `aria-controls`. */
  id: { type: String, required: true },
  /** Group label — shown as the flyout header in labels mode. */
  label: { type: String, required: true },
  /** Icon-only mode — flyout switches to a narrow icon-only layout. */
  iconOnly: { type: Boolean, required: true },
  /** Parent flyout's control passed through `SIDEBAR_FLYOUT_PARENT_KEY`. */
  parentControl: { type: Object as PropType<SidebarFlyoutParent | null>, default: null },
  /** Render function returning the default-slot VNodes from the owning group's scope. */
  renderContent: {
    type: Function as PropType<() => VNode[] | undefined>,
    required: true,
  },
});

defineEmits<{
  flyoutEnter: [];
  flyoutLeave: [];
}>();
</script>

<template>
  <SidebarFlyoutProvider :icon-only="iconOnly" :parent-control="parentControl">
    <div
      :id="id"
      class="coar-sidebar-flyout"
      :class="{ 'coar-sidebar-flyout--icons': iconOnly }"
      role="menu"
      @mouseenter="$emit('flyoutEnter')"
      @mouseleave="$emit('flyoutLeave')"
    >
      <div v-if="!iconOnly" class="coar-sidebar-flyout__header">{{ label }}</div>
      <div class="coar-sidebar-flyout__items">
        <component :is="{ render: renderContent }" />
      </div>
    </div>
  </SidebarFlyoutProvider>
</template>
