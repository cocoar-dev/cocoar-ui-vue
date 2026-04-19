<script setup lang="ts">
/**
 * Panel rendered by the overlay-service when `vTooltip` opens. The service handles
 * teleport, positioning, z-index stacking, and the fixed-positioning that used to live
 * inline on the tooltip element. This component is a thin visual shell around the
 * content text.
 *
 * `id` is passed in so the tooltip-describing trigger (`aria-describedby`) can reference
 * it — the service-generated host id is not exposed.
 */
defineProps<{
  content: string;
  id?: string;
}>();
</script>

<template>
  <div :id="id" class="coar-tooltip" role="tooltip">
    <span class="coar-tooltip-text">{{ content }}</span>
  </div>
</template>

<style scoped>
.coar-tooltip {
  /* pointer-events none so the tooltip never steals focus / clicks from the target */
  pointer-events: none;
}
</style>
