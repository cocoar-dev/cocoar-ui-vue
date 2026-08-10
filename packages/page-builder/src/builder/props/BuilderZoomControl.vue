<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';

/**
 * Zoom stepper shared by the editor canvas and the preview so the control sits
 * in the same place in both. It lives in a toolbar rather than floating over
 * the surface: an overlay would cover whatever the page renders underneath it.
 *
 * The percentage is editable — the steps are a convenience, not the range, so
 * any value between min and max can be typed.
 */
const props = defineProps<{ zoom: number; min: number; max: number }>();
const emit = defineEmits<{ step: [direction: 1 | -1]; set: [zoom: number]; reset: [] }>();

const { t } = useI18n();

const draft = ref(String(Math.round(props.zoom * 100)));
const editing = ref(false);

// While typing, the field is the author's; outside that it follows the state,
// which also snaps a rejected entry back to the real value.
watch(() => props.zoom, (value) => {
  if (!editing.value) draft.value = String(Math.round(value * 100));
});

const percentRange = computed(() => ({
  min: Math.round(props.min * 100),
  max: Math.round(props.max * 100),
}));

function commit() {
  editing.value = false;
  const parsed = Number.parseFloat(draft.value.replace(',', '.').replace('%', '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    draft.value = String(Math.round(props.zoom * 100));
    return;
  }
  emit('set', parsed / 100);
  // Clamping happens in the composable, so mirror the accepted value back.
  draft.value = String(Math.round(Math.min(percentRange.value.max, Math.max(percentRange.value.min, parsed))));
}

/**
 * Leaving edit mode first is what makes this work: the watcher below ignores
 * incoming values while the field is being edited, so without it the draft
 * would keep the pre-reset number and blur would write it straight back.
 */
function onReset() {
  editing.value = false;
  emit('reset');
  // The watcher only fires on an actual change, so a draft typed while the
  // level was already 100 would survive and be written back on blur.
  draft.value = String(Math.round(props.zoom * 100));
}

function cancel(event: Event) {
  editing.value = false;
  draft.value = String(Math.round(props.zoom * 100));
  (event.target as HTMLInputElement).blur();
}
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

    <span class="pb-zoom__field">
      <input
        v-model="draft"
        class="pb-zoom__input"
        type="text"
        inputmode="numeric"
        :aria-label="t('coar.pageBuilder.canvas.zoomLevel', undefined, 'Zoom level in percent')"
        :title="t('coar.pageBuilder.canvas.zoomReset', undefined, 'Reset zoom')"
        @focus="editing = true; ($event.target as HTMLInputElement).select()"
        @blur="commit"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        @keydown.esc.prevent="cancel"
        @dblclick="onReset"
      >
      <span class="pb-zoom__suffix" aria-hidden="true">%</span>
    </span>

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

.pb-zoom__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  cursor: pointer;
}

.pb-zoom__btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-text-neutral-primary, #202124);
}

.pb-zoom__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pb-zoom__field {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
}

.pb-zoom__field:hover,
.pb-zoom__field:focus-within {
  border-color: var(--coar-border-neutral, #e2e2e6);
  background: var(--coar-background-neutral-primary, #fff);
}

.pb-zoom__input {
  width: 28px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  font: inherit;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
}

.pb-zoom__input:focus { color: var(--coar-text-neutral-primary, #202124); }

.pb-zoom__suffix {
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  font-size: 11px;
}
</style>
