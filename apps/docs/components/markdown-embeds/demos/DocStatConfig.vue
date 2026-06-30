<script setup lang="ts">
/**
 * Editable variant of the `:::stat{...}` embed, mounted by the editor NodeView.
 * Receives the single typed `controller` prop ({@link EmbedEditorProps}) and
 * writes changes back via `controller.patch(...)`, which round-trips into the
 * markdown. Shows the live `DocStat` preview plus inline config inputs.
 */
import { reactive, watch } from 'vue';
import type { EmbedEditorProps } from '@cocoar/vue-markdown';
import DocStat from './DocStat.vue';

const props = defineProps<EmbedEditorProps>();

// Local working copy so typing drives the preview instantly and survives the
// round-trip re-render without losing input focus.
const model = reactive<Record<string, string>>({ ...props.controller.props });

watch(
  () => props.controller.props,
  (next) => {
    for (const key of Object.keys(next)) {
      if (model[key] !== next[key]) model[key] = next[key] ?? '';
    }
  },
  { deep: true },
);

function onField(key: string, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  model[key] = value;
  props.controller.patch({ [key]: value });
}
</script>

<template>
  <div class="doc-stat-config">
    <div class="doc-stat-config__bar">
      <span class="doc-stat-config__tag">✎ Configure</span>
      <input :value="model.label ?? ''" placeholder="label" @input="onField('label', $event)" />
      <input :value="model.value ?? ''" placeholder="value" @input="onField('value', $event)" />
      <input :value="model.trend ?? ''" placeholder="trend" @input="onField('trend', $event)" />
    </div>
    <DocStat v-bind="model" />
  </div>
</template>

<style scoped>
.doc-stat-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.doc-stat-config__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px dashed var(--coar-border-accent, #6366f1);
  border-radius: 8px;
  background: color-mix(in srgb, var(--coar-border-accent, #6366f1) 7%, transparent);
}
.doc-stat-config__tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-accent, #4f46e5);
}
.doc-stat-config__bar input {
  font: inherit;
  font-size: 13px;
  padding: 4px 7px;
  width: 110px;
  border: 1px solid var(--coar-border-neutral, #d4d4d4);
  border-radius: 5px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #111);
}
</style>
