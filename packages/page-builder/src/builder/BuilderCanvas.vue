<script setup lang="ts">
import { inject, ref } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { BUILDER_API } from './builderContext';
import BuilderCanvasNode from './BuilderCanvasNode.vue';
import { useBuilderDnd } from './useBuilderDnd';
import { useCanvasZoom } from './useCanvasZoom';

defineOptions({ name: 'BuilderCanvas' });

const { t } = useI18n();
const builder = inject(BUILDER_API)!;
const dnd = useBuilderDnd();

const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const { zoom, step, reset, contentStyle, frameStyle } = useCanvasZoom(viewportRef, contentRef);

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

    <div class="pb-canvas__zoom-bar">
      <button
        type="button"
        class="pb-canvas__zoom-btn"
        :disabled="zoom <= 0.25"
        :title="t('coar.pageBuilder.canvas.zoomOut', undefined, 'Zoom out')"
        @click="step(-1)"
      >
        <CoarIcon name="minus" size="xs" />
      </button>
      <button
        type="button"
        class="pb-canvas__zoom-value"
        :title="t('coar.pageBuilder.canvas.zoomReset', undefined, 'Reset zoom')"
        @click="reset"
      >{{ Math.round(zoom * 100) }}%</button>
      <button
        type="button"
        class="pb-canvas__zoom-btn"
        :disabled="zoom >= 2"
        :title="t('coar.pageBuilder.canvas.zoomIn', undefined, 'Zoom in')"
        @click="step(1)"
      >
        <CoarIcon name="plus" size="xs" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pb-canvas-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.pb-canvas__zoom-bar {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.pb-canvas__zoom-btn,
.pb-canvas__zoom-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.pb-canvas__zoom-btn { width: 22px; padding: 0; }

.pb-canvas__zoom-btn:hover:not(:disabled),
.pb-canvas__zoom-value:hover {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-text-neutral-primary, #202124);
}

.pb-canvas__zoom-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pb-canvas__zoom-value {
  min-width: 40px;
  font-variant-numeric: tabular-nums;
}
</style>
