<script setup lang="ts">
import { provide, toRef } from 'vue';
import { SIDEBAR_FLYOUT_ICON_ONLY_KEY, SIDEBAR_FLYOUT_PARENT_KEY } from './sidebar-context';
import type { SidebarFlyoutParent } from './sidebar-context';

const props = defineProps<{
  iconOnly: boolean;
  parentControl: SidebarFlyoutParent | null;
}>();

provide(SIDEBAR_FLYOUT_ICON_ONLY_KEY, toRef(props, 'iconOnly'));
provide(SIDEBAR_FLYOUT_PARENT_KEY, props.parentControl);
</script>

<template>
  <slot />
</template>
