<script setup lang="ts">
import { inject } from 'vue';
import { BUILDER_API } from './builderContext';
import BuilderCanvasNode from './BuilderCanvasNode.vue';
import { useBuilderDnd } from './useBuilderDnd';

defineOptions({ name: 'BuilderCanvas' });

const builder = inject(BUILDER_API)!;
const dnd = useBuilderDnd();

function onCanvasBackgroundClick() {
  builder.select([]);
}
</script>

<template>
  <div
    class="pb-canvas"
    :class="{ 'pb-canvas--dragging': dnd.isDragging.value }"
    @click.self="onCanvasBackgroundClick"
  >
    <BuilderCanvasNode :node="builder.schema.value" :path="[]" />
  </div>
</template>

<style scoped>
.pb-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px 20px 20px;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.015) 0px,
      rgba(0, 0, 0, 0.015) 6px,
      transparent 6px,
      transparent 12px
    );
}
</style>
