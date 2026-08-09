<script setup lang="ts">
import { inject, ref } from 'vue';
import { BUILDER_API } from './builderContext';
import BuilderCanvasNode from './BuilderCanvasNode.vue';
import BuilderZoomControl from './props/BuilderZoomControl.vue';
import { useBuilderDnd } from './useBuilderDnd';
import { useCanvasZoom, CANVAS_ZOOM_STEPS } from './useCanvasZoom';

defineOptions({ name: 'BuilderCanvas' });

const builder = inject(BUILDER_API)!;
const dnd = useBuilderDnd();

const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
// The canvas has no width of its own, so the content is pinned to the viewport.
const { zoom, step, reset, contentStyle, frameStyle } = useCanvasZoom(
  viewportRef,
  contentRef,
  { pinToViewportWidth: true },
);

function onCanvasBackgroundClick() {
  builder.select([]);
}

/**
 * Ctrl/Cmd + wheel is the zoom gesture people already expect from design tools
 * and from the browser itself; without the modifier the canvas scrolls.
 */
function onWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  step(event.deltaY < 0 ? 1 : -1);
}
</script>

<template>
  <div class="pb-canvas-shell">
    <!-- Mirrors the preview toolbar so the zoom control sits in the same
         place in both views, and never covers the surface it scales. -->
    <div class="pb-canvas__toolbar">
      <BuilderZoomControl
        :zoom="zoom"
        :min="CANVAS_ZOOM_STEPS[0]"
        :max="CANVAS_ZOOM_STEPS[CANVAS_ZOOM_STEPS.length - 1]"
        @step="step"
        @reset="reset"
      />
    </div>
    <div
      ref="viewportRef"
      class="pb-canvas"
      :class="{ 'pb-canvas--dragging': dnd.isDragging.value }"
      @click.self="onCanvasBackgroundClick"
      @wheel="onWheel"
    >
      <div class="pb-canvas__frame" :style="frameStyle">
        <div ref="contentRef" class="pb-canvas__content" :style="contentStyle">
          <BuilderCanvasNode :node="builder.schema.value" :path="[]" />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.pb-canvas-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/*
 * Same metrics as .pb-builder__preview-toolbar so both views share one frame
 * and the zoom control lands on the same pixel when switching tabs. The
 * min-height keeps them aligned even though the preview bar also holds selects.
 */
.pb-canvas__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 38px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  flex-shrink: 0;
}

.pb-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px 24px 24px;
  background: var(--coar-background-neutral-secondary, #f7f8f9);
}

/*
 * Carries the space the scaled content occupies; a transform alone would not.
 * Auto margins centre it while it is narrower than the viewport and do nothing
 * once zooming in makes it wider.
 */
.pb-canvas__frame {
  min-width: 0;
  margin-inline: auto;
}

.pb-canvas__content {
  min-width: 0;
}

</style>
