<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';

/**
 * Zoom stepper shared by the editor canvas and the preview so the control sits
 * in the same place in both. It lives in a toolbar rather than floating over
 * the surface: an overlay would cover whatever the page renders underneath it.
 */
defineProps<{ zoom: number; min: number; max: number }>();
const emit = defineEmits<{ step: [direction: 1 | -1]; reset: [] }>();

const { t } = useI18n();
</script>

<template>
  <div class="pb-zoom">
    <button
      type="button"
      class="pb-zoom__btn"
      :disabled="zoom <= min"
      :title="t('coar.pageBuilder.canvas.zoomOut', undefined, 'Zoom out')"
      @click="emit('step', -1)"
    >
      <CoarIcon name="minus" size="xs" />
    </button>
    <button
      type="button"
      class="pb-zoom__value"
      :title="t('coar.pageBuilder.canvas.zoomReset', undefined, 'Reset zoom')"
      @click="emit('reset')"
    >{{ Math.round(zoom * 100) }}%</button>
    <button
      type="button"
      class="pb-zoom__btn"
      :disabled="zoom >= max"
      :title="t('coar.pageBuilder.canvas.zoomIn', undefined, 'Zoom in')"
      @click="emit('step', 1)"
    >
      <CoarIcon name="plus" size="xs" />
    </button>
  </div>
</template>

<style scoped>
.pb-zoom {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.pb-zoom__btn,
.pb-zoom__value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.pb-zoom__btn { width: 22px; }

.pb-zoom__value {
  min-width: 40px;
  padding: 0 4px;
  font-variant-numeric: tabular-nums;
}

.pb-zoom__btn:hover:not(:disabled),
.pb-zoom__value:hover {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-text-neutral-primary, #202124);
}

.pb-zoom__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
