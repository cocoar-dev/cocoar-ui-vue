<script setup lang="ts">
import { inject, ref } from 'vue';
import { SIDEBAR_COLLAPSED_KEY } from './sidebar-context';

const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
</script>

<template>
  <div
    class="coar-sidebar-divider"
    :class="{ 'coar-sidebar-divider--collapsed': sidebarCollapsed }"
    role="separator"
  />
</template>

<style scoped>
.coar-sidebar-divider {
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  margin: var(--coar-spacing-xs) var(--coar-spacing-s);
}

.coar-sidebar-divider--collapsed {
  margin: var(--coar-spacing-xs) var(--coar-spacing-3xs);
}
</style>
