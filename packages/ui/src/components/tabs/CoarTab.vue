<script setup lang="ts">
/**
 * Individual tab definition for use within CoarTabGroup.
 * The default slot provides the tab label (text, icons, badges, etc.).
 * The #content slot provides the tab panel content.
 */
defineProps<{
  /** Unique identifier for this tab */
  id: string;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /**
   * Loading strategy for the tab content.
   * - 'lazy' (default): content rendered only when active
   * - 'eager': content always in DOM, hidden when inactive
   */
  loadingStrategy?: 'lazy' | 'eager';
}>();
</script>

<template>
  <slot />
</template>
