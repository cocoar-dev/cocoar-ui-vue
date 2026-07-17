<script setup lang="ts">
import { computed } from 'vue';
import type { StackNode } from '../../schema';
import { containerLayoutStyle } from '../../styleMapping';

const props = defineProps<{ node: StackNode }>();

const layoutStyle = computed(() => containerLayoutStyle(props.node.style));
</script>

<template>
  <div
    class="pb-stack"
    :class="{
      'pb-stack--row': node.props.direction === 'row',
      'pb-stack--wrap': node.props.wrap,
    }"
    :style="layoutStyle"
  >
    <slot />
  </div>
</template>

<style scoped>
.pb-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pb-stack--row {
  flex-direction: row;
}

/*
 * Allow row children to shrink below their content size (prevents overflow of
 * long labels). Children are natural-width by default; growing to fill is opt-in
 * via the node's `size: 'fill'` (see styleMapping.ts), not forced here.
 */
.pb-stack--row > :slotted(*) {
  min-width: 0;
}

.pb-stack--wrap {
  flex-wrap: wrap;
}
</style>
